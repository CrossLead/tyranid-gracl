/// <reference path='../../typings/main.d.ts' />
import * as Tyr from 'tyranid';
import { PermissionsModel } from '../models/PermissionsModel';
import * as gracl from 'gracl';
import * as _ from 'lodash';

import {
  Hash,
  findLinkInCollection,
  getCollectionLinksSorted,
  createInQueries,
  stepThroughCollectionPath
} from '../util';


export class GraclPlugin {


  // create a repository object for a given collection
  static makeRepository(collection: Tyr.CollectionInstance): gracl.Repository {
    return {
      async getEntity(id: string, node: gracl.Node): Promise<Tyr.Document> {
        return <Tyr.Document> (
          await collection.populate(
            'permissionIds',
            await collection.byId(id)
          )
        );
      },
      async saveEntity(id: string, doc: Tyr.Document, node: gracl.Node): Promise<Tyr.Document> {
        return PermissionsModel.updatePermissions(doc);
      }
    };
  }


  /**
   *  Create graph of outgoing links to collections and
      compute shortest paths between all edges (if exist)
      using Floyd–Warshall Algorithm with path reconstruction
   */
  static buildLinkGraph(): Hash<Hash<string>> {
    const g: Hash<Set<string>> = {};

    _.each(Tyr.collections, col => {
      const links = col.links({ direction: 'outgoing' }),
            colName = col.def.name;

      _.each(links, linkField => {
        const edges = _.get(g, colName, new Set<string>()),
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


  getObjectHierarchy() {
    const hierarchy = {
      subjects: {},
      resources: {}
    };

    const build = (obj: any) => (node: typeof gracl.Node) => {
      const path = node.getHierarchyClassNames().reverse();
      let o = obj;
      for (const name of path) {
        o = o[name] = o[name] || {};
      }
    };

    this.graclHierarchy.subjects.forEach(build(hierarchy.subjects));
    this.graclHierarchy.resources.forEach(build(hierarchy.resources));
    return hierarchy;
  }


  /**
   *  Construct a path from collection a to collection b using
      the pre-computed paths in GraclPlugin.outgoingLinkPaths
   */
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

      /**
       *  Add methods to document prototype
       */
      Object.assign(Tyr.documentPrototype, {
        $setPermissionAccess(permissionType: string, access: boolean, subjectDocument = Tyr.local.user) {
          const doc = <Tyr.Document> this;
          return PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
        },

        $isAllowed(permissionType: string, subjectDocument = Tyr.local.user) {
          const doc = <Tyr.Document> this;
          return PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
        }
      });

      // type alias for convienience
      type TyrSchemaGraphObjects = {
        links: Tyr.Field[];
        parents: Tyr.CollectionInstance[];
      };

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

        const allOutgoingFields = col.links({ direction: 'outgoing' });

        const validateField = (f: Tyr.Field) => {
          return f.def.link === 'graclPermission' && f.name === 'permissionIds';
        };

        if (!_.find(allOutgoingFields, validateField)) {
          throw new Error(
            `Tyranid collection \"${col.def.name}\" has \"graclType\" annotation but no \"permissionIds\" field. ` +
            `tyranid-gracl requires a field on secured collections of type: \n` +
            `\"permissionIds: { is: 'array', link: 'graclPermission' }\"`
          );
        }

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
                parentName = node.link.def.name,
                parentNamePath = node.collection.parsePath(node.path);

          nodes.set(name,
            { name,
              id: '$uid',
              parent: parentName,
              repository: GraclPlugin.makeRepository(node.collection),
              async getParents(): Promise<gracl.Node[]> {
                const thisNode = <gracl.Node> this;

                let ids: any = parentNamePath.get(thisNode.doc);

                if (!(ids instanceof Array)) {
                  ids = [ ids ];
                }

                const linkCollection = node.link;

                const parentObjects = await linkCollection.find({
                        [linkCollection.def.primaryKey.field]: { $in: ids }
                      }, null, { tyranid: { insecure: true } }),
                      ParentClass = thisNode.getParentClass();

                return parentObjects.map(doc => new ParentClass(doc));
              }
            }
          );
        }

        for (const parent of tyrObjects.parents) {
          const name = parent.def.name;
          if (!nodes.has(name)) {
            nodes.set(name, {
              name,
              id: '$uid',
              repository: GraclPlugin.makeRepository(parent)
            });
          }
        }

      }

      this.log(`creating link graph.`);
      this.outgoingLinkPaths = GraclPlugin.buildLinkGraph();

      this.graclHierarchy = new gracl.Graph({
        subjects: Array.from(schemaMaps.subjects.values()),
        resources: Array.from(schemaMaps.resources.values())
      });

      this.log(`created gracl hierarchy based on tyranid schemas: `);

      if (this.verbose) {
        console.log(
          '  | \n  | ' +
          JSON
            .stringify(this.getObjectHierarchy(), null, 4)
            .replace(/[{},\":]/g, '')
            .replace(/^\s*\n/gm, '')
            .split('\n')
            .join('\n  | ')
            .replace(/\s+$/, '')
            .replace(/resources/, '---- resources ----')
            .replace(/subjects/, '---- subjects ----') +
          '____'
        );
      }

    }
  }



  /**
   *  Method for creating a specific query based on a schema object
   */
  async query(queriedCollection: Tyr.CollectionInstance,
              permissionAction: string,
              user = Tyr.local.user): Promise<boolean | {}> {

    const queriedCollectionName = queriedCollection.def.name;

    if (queriedCollectionName === PermissionsModel.def.name) {
      this.log(`skipping query modification for ${PermissionsModel.def.name}`);
      return {};
    }

    const permissionType = `${permissionAction}-${queriedCollectionName}`;

    if (!permissionAction) {
      throw new Error(`No permissionAction given to GraclPlugin.query()!`);
    }

    if (!this.graclHierarchy) {
      throw new Error(`Must call GraclPlugin.boot() before using GraclPlugin.query()!`);
    }

    // if no user, no restriction...
    if (!user) {
      this.log(`No user passed to GraclPlugin.query() (or found on Tyr.local) -- no documents allowed!`);
      return false;
    }

    this.log(
      `restricting query for collection = ${queriedCollectionName} ` +
      `permissionType = ${permissionType} ` +
      `user = ${JSON.stringify(user.$toClient())}`
    );

    if (!this.graclHierarchy.resources.has(queriedCollectionName)) {
      this.log(
        `Querying against collection (${queriedCollectionName}) with no resource class -- no restriction enforced!`
      );
      return {};
    }


    // extract subject and resource Gracl classes
    const ResourceClass = this.graclHierarchy.getResource(queriedCollectionName),
          SubjectClass = this.graclHierarchy.getSubject(user.$model.def.name);

    const subject = new SubjectClass(user);

    const errorMessageHeader = (
      `Unable to construct query object for ${queriedCollection.name} ` +
      `from the perspective of ${subject.toString()}`
    );

    // get list of all ids in the subject hierarchy,
    // as well as the names of the classes in the resource hierarchy
    const subjectHierarchyIds = await subject.getHierarchyIds();

    const resourceHierarchyClasses = ResourceClass.getHierarchyClassNames();

    const permissionsQuery = {
      subjectId:    { $in: subjectHierarchyIds },
      resourceType: { $in: resourceHierarchyClasses }
    };

    const permissions = await PermissionsModel.find(permissionsQuery, null, { tyranid: { insecure: true } });

    // no permissions found, return no restriction
    if (!Array.isArray(permissions) || permissions.length === 0) {
      this.log(`No permissions found, returning false!`);
      return false;
    }

    type resourceMapEntries = {
      permissions: Map<string, any>,
      collection: Tyr.CollectionInstance
    };

    const resourceMap = permissions.reduce((map, perm) => {
      const resourceCollectionName = <string> perm['resourceType'],
            resourceId = <string> perm['resourceId'];

      if (!map.has(resourceCollectionName)) {
        map.set(resourceCollectionName, {
          collection: Tyr.byName[resourceCollectionName],
          permissions: new Map()
        });
      }

      map.get(resourceCollectionName).permissions.set(resourceId, perm);
      return map;
    }, new Map<string, resourceMapEntries>());


    // loop through all the fields in the collection that we are
    // building the query string for, grabbing all fields that are links
    // and storing them in a map of (linkFieldCollection => Field)
    const queriedCollectionLinkFields = getCollectionLinksSorted(queriedCollection)
      .reduce((map, field) => {
        map.set(field.def.link, field);
        return map;
      }, new Map<string, Tyr.Field>());

    const queryMaps: Hash<Map<string, Set<string>>> = {
      positive: new Map<string, Set<string>>(),
      negative: new Map<string, Set<string>>()
    };



    // extract all collections that have a relevant permission set for the requested resource
    for (const [ collectionName, { collection, permissions } ] of resourceMap) {

      let queryRestrictionSet = false;
      // check to see if the collection we are querying has a field linked to <collectionName>
      if (queriedCollectionLinkFields.has(collectionName)) {
        for (const permission of permissions.values()) {
          // grab access boolean for given permissionType
          const access = permission.access[permissionType];
          switch (access) {
            // access needs to be exactly true or false
            case true:
            case false:
              const key = (access ? 'positive' : 'negative');
              if (!queryMaps[key].has(collectionName)) {
                queryMaps[key].set(collectionName, new Set());
              }
              queryMaps[key].get(collectionName).add(permission.resourceId);
              break;
          }
          queryRestrictionSet = true;
        }
      }
      // otherwise, we need determine how to restricting a query of this object by
      // permissions concerning parents of this object...
      else {
        /**
          Example:

          SETUP: want to query for all posts from database, have permissions
            set for access to posts on posts, blogs, and organizations...

          - for the permissions set on posts specifically, we can just add something like...

            {
              _id: { $in: [ <post-ids>... ] }
            }

          - for the blog permissions, since there is a "blogId" link property on posts,
            we can just add...

            {
              _id: { $in: [ <postIds>... ] },
              blogId: { $in: [ <blogIds>... ] }
            }

          - for the organizations, as there is no organiationId property on the posts,
            we need to find a "path" between posts and organiations (using the pre-computed paths)

              - take all organizationIds present on permissions
              - find all blogs in all those organizations, store in $BLOGS
              - add $BLOGS to query, not overriding permissions set above
        */

        // get computed shortest path between the two collections
        const path = this.getShortestPath(queriedCollection, collection);

        if (!path.length) {
          throw new Error(
            `${errorMessageHeader}, as there is no path between ` +
            `collections ${queriedCollectionName} and ${collectionName} in the schema.`
          );
        }

        // remove end of path (which should equal the collection of interest on the permission)
        const pathEndCollectionName = path.pop();

        if (collectionName !== pathEndCollectionName) {
          throw new Error(
            `Path returned for collection pair ${queriedCollectionName} and ${collectionName} is invalid!`
          );
        }

        // assert that the penultimate path collection exists as a link on the queriedCollection
        if (!queriedCollectionLinkFields.has(path[1])) {
          throw new Error(
            `Path returned for collection pair ${queriedCollectionName} and ${collectionName} ` +
            `must have the penultimate path exist as a link on the collection being queried, ` +
            `the penultimate collection path between ${queriedCollectionName} and ${collectionName} ` +
            `is ${path[1]}, which is not linked to by ${queriedCollectionName}`
          );
        }

        let positiveIds: string[] = [],
            negativeIds: string[] = [];

        for (const permission of permissions.values()) {
          // grab access boolean for given permissionType
          const access = permission.access[permissionType];
          switch (access) {
            // access needs to be exactly true or false
            case true:  positiveIds.push(Tyr.parseUid(permission.resourceId).id); break;
            case false: negativeIds.push(Tyr.parseUid(permission.resourceId).id); break;
          }
        }

        const pathEndCollection = Tyr.byName[pathEndCollectionName],
              nextCollection = Tyr.byName[_.last(path)];

        positiveIds = await stepThroughCollectionPath(positiveIds, pathEndCollection, nextCollection);
        negativeIds = await stepThroughCollectionPath(negativeIds, pathEndCollection, nextCollection);

        // the remaining path collection is equal to the collection we are trying to query,
        // we don't need to do another link in the path, as the current path collection
        // has a link that exists on the queried collection
        let pathCollectionName: string,
            nextCollectionName: string;
        while (path.length > 2) {
          const pathCollection = Tyr.byName[pathCollectionName = path.pop()],
                nextCollection = Tyr.byName[nextCollectionName = _.last(path)];

          if (!pathCollection) {
            throw new Error(
              `${errorMessageHeader}, invalid collection name given in path! collection: ${pathCollectionName}`
            );
          }

          /**
           * we need to recursively collect objects along the path,
             until we reach a collection that linked to the queriedCollection
           */
          positiveIds = await stepThroughCollectionPath(positiveIds, pathCollection, nextCollection);
          negativeIds = await stepThroughCollectionPath(negativeIds, pathCollection, nextCollection);
        }

        // now, "nextCollectionName" should be referencing a collection
        // that is directly linked to by queriedCollection,
        // and positive / negativeIds should contain ids of documents
        // from <nextCollectionName>
        const linkedCollectionName = nextCollection.def.name;

        const addIdsToQueryMap = (access: boolean) => (id: string) => {
          const accessString    = access ? 'positive' : 'negative',
                altAccessString = access ? 'negative' : 'positive';

          if (!queryMaps[accessString].has(linkedCollectionName)) {
            queryMaps[accessString].set(linkedCollectionName, new Set());
          }

          // if the id was set previously, by a lower level link,
          // dont override the lower level
          if (!queryMaps[altAccessString].has(linkedCollectionName) ||
              !queryMaps[altAccessString].get(linkedCollectionName).has(id)) {
            queryMaps[accessString].get(linkedCollectionName).add(id);
          }
        };

        // add the ids to the query maps
        _.each(positiveIds, addIdsToQueryMap(true));
        _.each(negativeIds, addIdsToQueryMap(false));
        queryRestrictionSet = true;
      }

      if (!queryRestrictionSet) {
        throw new Error(
          `${errorMessageHeader}, unable to set query restriction ` +
          `to satisfy permissions relating to collection ${collectionName}`
        );
      }
    }

    const positiveRestriction = createInQueries(queryMaps['positive'], queriedCollection, '$in'),
          negativeRestriction = createInQueries(queryMaps['negative'], queriedCollection, '$nin');

    const restricted: any = {},
          hasPositive = _.chain(positiveRestriction).keys().any().value(),
          hasNegative = _.chain(negativeRestriction).keys().any().value();

    if (hasNegative && hasPositive) {
      restricted['$and'] = [
        positiveRestriction,
        negativeRestriction
      ];
    } else if (hasNegative) {
      Object.assign(restricted, negativeRestriction);
    } else if (hasPositive) {
      Object.assign(restricted, positiveRestriction);
    }

    return restricted;
  }


}
