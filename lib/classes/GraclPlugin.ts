/// <reference path='../../typings/main.d.ts' />

import * as Tyr from 'tyranid';
import { PermissionsModel } from '../collections/PermissionsModel';
import * as gracl from 'gracl';
import * as _ from 'lodash';


export type Hash<T> = {
  [key: string]: T;
};

export type TyrSchemaGraphObjects = {
  links: Tyr.Field[];
  parents: Tyr.CollectionInstance[];
};

export type LinkGraph = {
  [collectionName: string]: Set<string>
}

export function createInQueries(
                  map: Map<string, string[]>,
                  queriedCollection: Tyr.CollectionInstance,
                  key: string
                ) {
  return Array.from(map.entries())
    .reduce((out: Hash<Hash<string[]>>, [col, uids]) => {
      // if the collection is the same as the one being queried, use the primary id field
      if (col === queriedCollection.def.name) {
        col = queriedCollection.def.primaryKey.field;
      }
      out[col] = { [key]: uids.map((u: string) => Tyr.parseUid(u).id) };
      return out;
    }, {});
};



export class GraclPlugin {


  // create a repository object for a given collection
  static makeRepository(collection: Tyr.CollectionInstance): gracl.Repository {
    return {
      async getEntity(id: string): Promise<Tyr.Document> {
        return <Tyr.Document> (
          await collection.populate(
            'permissions',
            await collection.byId(id)
          )
        );
      },
      async saveEntity(id: string, doc: Tyr.Document): Promise<Tyr.Document> {
        await PermissionsModel.updatePermissions(doc, 'subject');
        return await doc.$save();
      }
    };
  }


  /**
   *  Create graph of outgoing links to collections and
      compute shortest paths between all edges (if exist)
      using Floyd–Warshall Algorithm with path reconstruction
   */
  static buildLinkGraph(): Hash<Hash<string>> {
    const g: LinkGraph = {};

    _.each(Tyr.collections, col => {
      const links = col.links({ direction: 'outgoing' }),
            colName = col.def.name;
      _.each(links, linkField => {
        const edges = _.get(g, colName, new Set()),
              linkName = linkField.link.def.name;

        edges.add(linkName);

        _.set(g, linkName, _.get(g, linkName, new Set()));
        _.set(g, colName, edges);
      });
    });

    const dist: Hash<Hash<number>> = {},
          next: Hash<Hash<string>> = {},
          keys = _.keys(g);


    // initialize dist and next matricies
    _.each(keys, a => {
      _.each(keys, b => {
        _.set(dist, `${a}.${b}`, Infinity);
      });
    });

    _.each(keys, a => {
      _.set(dist, `${a}.${a}`, 0);
    });

    _.each(keys, a => {
      _.each(keys, b => {
        if (g[a].has(b)) {
          _.set(dist, `${a}.${b}`, 1);
          _.set(next, `${a}.${b}`, b);
        }
      });
    });

    // Floyd–Warshall Algorithm with path reconstruction
    _.each(keys, a => {
      _.each(keys, b => {
        _.each(keys, c => {
          if (dist[b][c] > dist[b][a] + dist[a][c]) {
            dist[b][c] = dist[b][a] + dist[a][c];
            next[b][c] = next[b][a];
          }
        });
      });
    });

    return next;
  }


  graclHierarchy: gracl.Graph;
  outgoingLinkPaths: Hash<Hash<string>>;

  constructor(public verbose = false) {};


  log(message: string) {
    if (this.verbose) {
      console.log(`tyranid-gracl: ${message}`);
    }
    return this;
  }


  getShortestPath(colA: Tyr.CollectionInstance, colB: Tyr.CollectionInstance) {
    let a = colA.def.name,
        b = colB.def.name,
        originalEdge = `${a}.${b}`,
        next = this.outgoingLinkPaths;

    if (!_.get(next, originalEdge)) return [];

    const path: string[] = [ a ];

    while (a !== b) {
      a = <string> _.get(next, `${a}.${b}`);
      if (!a) return [];
      path.push(a);
    }

    return path;
  }


  /**
    Create Gracl class hierarchy from tyranid schemas,
    needs to be called after all the tyranid collections are validated
   */
  boot(stage: Tyr.BootStage) {
    if (stage === 'post-link') {
      this.log(`starting boot.`);

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
              // TODO: ask ted if there is a cleaner way to do this
              parentId: node.name === node.path ?
                node.name :
                node.path.split('.')[0],
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

      this.log(`creating link graph.`);
      this.outgoingLinkPaths = GraclPlugin.buildLinkGraph();

      this.log(`creating gracl hierarchy`);
      this.graclHierarchy = new gracl.Graph({
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

    if (!this.graclHierarchy) {
      throw new Error(`Must call this.boot() before using this.query()!`);
    }

    // if no user, no restriction...
    if (!user) return false;

    // extract subject and resource Gracl classes
    const ResourceClass = this.graclHierarchy.getResource(queriedCollection.def.name),
          SubjectClass = this.graclHierarchy.getSubject(user.$model.def.name);

    const subject = new SubjectClass(user);

    const errorMessageHeader = (
      `Unable to construct query object for ${queriedCollection.name} ` +
      `from the perspective of ${subject.toString()}`
    );

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
      let queryRestrictionSet = false;
      // check to see if the collection we are querying has a field linked to <collectionName>
      if (queriedCollectionLinkFields.has(collectionName)) {
        for (const permission of permissions.values()) {
          const access = permission.access[permissionType];
          switch (access) {
            // access needs to be exactly true or false
            case true:
            case false:
              const key = (access ? 'positive' : 'negative');
              if (!queryMaps[key].has(collectionName)) {
                queryMaps[key].set(collectionName, [ permission.resourceId ]);
              } else {
                queryMaps[key].get(collectionName).push(permission.resourceId);
              }
              break;
          }
          queryRestrictionSet = true;
        }
      }
      // otherwise, we need determine how to restricting a query of this object by
      // permissions concerning parents of this object...
      else {
        // get computed shortest path between the two collections
        const path = this.getShortestPath(queriedCollection, collection);
        if (!path.length) {
          throw new Error(
            `${errorMessageHeader}, as there is no path between ` +
            `collections ${queriedCollection.def.name} and ${collectionName} in the schema.`
          );
        }

        let pathCollectionName: string;
        while (pathCollectionName = path.pop()) {
          const pathCollection = Tyr.byName[pathCollectionName];
        }


      }
      if (!queryRestrictionSet) {
        throw new Error(
          `${errorMessageHeader}, unable to set query restriction ` +
          `to satisfy permissions relating to collection ${collectionName}`
        );
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
