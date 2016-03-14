/// <reference path='../../typings/main.d.ts' />

import Tyr from 'tyranid';
import { PermissionsModel } from '../collections/PermissionsModel';
import * as gracl from 'gracl';


export type Hash<T> = {
  [key: string]: T;
};

export type TyrSchemaGraphObjects = {
  links: Tyr.Field[];
  parents: Tyr.CollectionInstance[];
};


export function createInQueries(
                  map: Map<string, string[]>,
                  queriedCollection: Tyr.CollectionInstance,
                  key: string
                ) {
  return Array.from(map.entries())
    .reduce((out: Hash<Hash<string[]>>, [col, uids]) => {
      // if the collection is the same as the one being queried, use the primary id field
      if (col === queriedCollection.name) {
        col = queriedCollection.def.primaryKey.field;
      }
      out[col] = { [key]: uids.map(Tyr.parseUid) };
      return out;
    }, {});
};



export class GraclPlugin {


  // create a repository object for a given collection
  static makeRepository(collection: Tyr.CollectionInstance): gracl.Repository {
    return {
      async getEntity(id: string): Promise<Tyr.Document> {
        return await collection.byId(id);
      },
      async saveEntity(id: string, doc: Tyr.Document): Promise<Tyr.Document> {
        return await doc.$save();
      }
    };
  }


  graph: gracl.Graph;


  /**
    Create Gracl class hierarchy from tyranid schemas,
    needs to be called after all the tyranid collections are validated
   */
  boot(stage: Tyr.BootStage) {
    if (stage === 'post-link') {
      const collections = Tyr.collections,
            nodeSet = new Set<string>();

      const schemaObjects = {
        subjects: <TyrSchemaGraphObjects> {
          links: [],
          parents: []
        },
        resources: <TyrSchemaGraphObjects> {
          links: [],
          parents: []
        }
      };


      // loop through all collections, retrieve
      // ownedBy links
      collections.forEach(col => {
        const linkFields = col.links({ relate: 'ownedBy', direction: 'outgoing' }),
              collectionName = col.def.name;

        if (!linkFields.length) return;

        // validate that we can only have one parent of each field.
        if (linkFields.length > 1) {
          throw new Error(
            `tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ` +
            `Collection ${collectionName} has multiple fields with outgoing ownedBy relations.`
          );
        }

        const [ field ] = linkFields,
              { graclType } = field.def;

        if (!graclType) return;

        // validate gracl type
        switch (graclType) {
          case 'subject':
            schemaObjects.subjects.links.push(field);
            schemaObjects.subjects.parents.push(field.link);
            break;
          case 'resource':
            schemaObjects.resources.links.push(field);
            schemaObjects.resources.parents.push(field.link);
            break;
          default:
            throw new Error(`Invalid gracl node type set on collection ${collectionName}, type = ${graclType}`);
        }
      });

      const schemaMaps = {
        subjects: new Map<string, gracl.SchemaNode>(),
        resources: new Map<string, gracl.SchemaNode>()
      };

      for (const type of ['subjects', 'resources']) {
        let nodes: Map<string, gracl.SchemaNode>,
            tyrObjects: TyrSchemaGraphObjects;

        if (type === 'subjects') {
          nodes = schemaMaps.subjects;
          tyrObjects = schemaObjects.subjects;
        } else {
          nodes = schemaMaps.resources;
          tyrObjects = schemaObjects.resources;
        }

        for (const node of tyrObjects.links) {
          const name = node.collection.def.name,
                parentName = node.link.def.name;

          nodes.set(name,
            { name,
              parent: parentName,
              parentId: node.name,
              repository: GraclPlugin.makeRepository(node.collection)
            }
          );
        }

        for (const parent of tyrObjects.parents) {
          const name = parent.def.name;
          if (!nodes.has(name)) {
            nodes.set(name, {
              name,
              repository: GraclPlugin.makeRepository(parent)
            });
          }
        }

      }

      this.graph = new gracl.Graph({
        subjects: Array.from(schemaMaps.subjects.values()),
        resources: Array.from(schemaMaps.resources.values())
      });

    }
  }


  /**
   *  Method for creating a specific query based on a schema object
   */
  async query(queriedCollection: Tyr.CollectionInstance,
              permissionType: string,
              user = Tyr.local.user): Promise<boolean | {}> {

    if (!this.graph) {
      throw new Error(`Must call this.boot() before using query method!`);
    }

    // if no user, no restriction...
    if (!user) return false;

    // extract subject and resource Gracl classes
    const ResourceClass = this.graph.getResource(queriedCollection.def.name),
          SubjectClass = this.graph.getSubject(user.$model.def.name);

    const subject = new SubjectClass(user);

    // get list of all ids in the subject hierarchy,
    // as well as the names of the classes in the resource hierarchy
    const subjectHierarchyIds = await subject.getHierarchyIds(),
          resourceHierarchyClasses = ResourceClass.getHierarchyClassNames();

    const permissions = await PermissionsModel.find({
      subjectId:    { $in: subjectHierarchyIds },
      resourceType: { $in: resourceHierarchyClasses }
    });

    if (!Array.isArray(permissions)) return false;

    type resourceMapEntries = {
      permissions: Map<string, any>,
      collection: Tyr.CollectionInstance
    };
    const resourceMap = new Map<string, resourceMapEntries>();

    for (const perm of permissions) {
      const resourceCollectionName = <string> perm['resourceType'],
            resourceId = <string> perm['resourceId'];

      if (!resourceMap.has(resourceCollectionName)) {
        resourceMap.set(resourceCollectionName, {
          collection: Tyr.byName[resourceCollectionName],
          permissions: new Map
        });
      }

      resourceMap
        .get(resourceCollectionName)
        .permissions
        .set(resourceId, perm);
    }

    // loop through all the fields in the collection that we are
    // building the query string for, grabbing all fields that are links
    // and storing them in a map of (linkFieldCollection => Field)
    const queriedCollectionLinkFields = new Map<string, Tyr.Field>();
    queriedCollection
      .links({ direction: 'outgoing' })
      .forEach(field => {
        queriedCollectionLinkFields.set(field.def.link, field);
      });

    const queryMaps: Hash<Map<string, string[]>> = {
      positive: new Map<string, string[]>(),
      negative: new Map<string, string[]>()
    };

    // extract all collections that have a relevant permission set for the requested resource
    for (const [ collectionName, { collection, permissions } ] of resourceMap) {
      // check to see if the collection we are querying has a field linked to <collectionName>
      if (queriedCollectionLinkFields.has(collectionName)) {
        for (const permission of permissions.values()) {
          const access = permission.access[permissionType];
          switch (access) {
            // access needs to be exactly true or false
            case true:
            case false:
              const key = (access ? 'positive' : 'negative');
              if (!queryMaps[<string> key].has(collectionName)) {
                queryMaps[<string> key].set(collectionName, [ permission.resourceId ]);
              } else {
                queryMaps[<string> key].get(collectionName).push(permission.resourceId);
              }
              break;
          }
        }
      }
      // otherwise, we need determine how to restricting a query of this object by
      // permissions concerning parents of this object...
      else {
        for (let link of queriedCollectionLinkFields.values()) {
          let parentLinks = link.collection.links({ direction: 'outgoing' });
          while (parentLinks.length) {

          }
        }
      }
    }


    return {
      $and: [
        createInQueries(queryMaps['positive'], queriedCollection, '$in'),
        createInQueries(queryMaps['negative'], queriedCollection, '$nin')
      ]
    };
  }


}
