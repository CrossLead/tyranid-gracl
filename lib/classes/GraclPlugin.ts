/// <reference path='../../typings/main.d.ts' />
import Tyr from 'tyranid';
import * as gracl from 'gracl';
import * as _ from 'lodash';
import { PermissionsModel } from '../models/PermissionsModel';
import { PermissionLocks } from '../models/PermissionsLocks';
import {
  Hash,
  findLinkInCollection,
  getCollectionLinksSorted,
  createInQueries,
  stepThroughCollectionPath
} from '../util';


export type permissionTypeList = Hash<string>[];
export type permissionHierarchy = Hash<any>;
export type pluginOptions = {
  verbose?: boolean;
  permissionTypes?: permissionTypeList;
  permissionProperty?: string;
};


export class GraclPlugin {


  /**
   *  alias permissions model methods here
   */
  static isAllowed = (
    <typeof PermissionsModel.isAllowed> PermissionsModel.isAllowed.bind(PermissionsModel)
  );

  static setPermissionAccess = (
    <typeof PermissionsModel.setPermissionAccess> PermissionsModel.setPermissionAccess.bind(PermissionsModel)
  );

  static deletePermissions = (
    <typeof PermissionsModel.deletePermissions> PermissionsModel.deletePermissions.bind(PermissionsModel)
  );

  static explainPermission = (
    <typeof PermissionsModel.explainPermission> PermissionsModel.explainPermission.bind(PermissionsModel)
  );


  /**
   *  Methods to mixin to Tyr.documentPrototype for working with permissions
   */
  static documentMethods = {

    $setPermissionAccess(
        permissionType: string,
        access: boolean,
        subjectDocument = Tyr.local.user
      ): Promise<Tyr.Document> {

      const doc = <Tyr.Document> this;
      return PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
    },

    $isAllowed(
      permissionType: string,
      subjectDocument = Tyr.local.user
    ): Promise<boolean> {
      const doc = <Tyr.Document> this;
      return PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
    },

    $isAllowedForThis(permissionAction: string, subjectDocument = Tyr.local.user): Promise<boolean> {
      const doc = <Tyr.Document> this;
      const permissionType = `${permissionAction}-${doc.$model.def.name}`;
      return this.$isAllowed(permissionType, subjectDocument);
    },

    $allow(permissionType: string, subjectDocument = Tyr.local.user): Promise<Tyr.Document> {
      return this.$setPermissionAccess(permissionType, true, subjectDocument);
    },

    $deny(permissionType: string, subjectDocument = Tyr.local.user): Promise<Tyr.Document> {
      return this.$setPermissionAccess(permissionType, false, subjectDocument);
    },

    $allowForThis(permissionAction: string, subjectDocument = Tyr.local.user): Promise<Tyr.Document> {
      const doc = <Tyr.Document> this;
      const permissionType = `${permissionAction}-${doc.$model.def.name}`;
      return this.$allow(permissionType, subjectDocument);
    },

    $denyForThis(permissionAction: string, subjectDocument = Tyr.local.user): Promise<Tyr.Document> {
      const doc = <Tyr.Document> this;
      const permissionType = `${permissionAction}-${doc.$model.def.name}`;
      return this.$deny(permissionType, subjectDocument);
    }

  };



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



  /**
   * validate and insert provided permissionHierarchy into model
   */
  static constructPermissionHierarchy(permissionsTypes: permissionTypeList ): permissionHierarchy {

    // sort to find circular deps
    const sorted = gracl.topologicalSort(permissionsTypes);

    if (_.uniq(sorted, false, 'name').length !== sorted.length) {
      throw new Error(`Duplicate permission types provided: ${permissionsTypes}`);
    }

    const hierarchy: permissionHierarchy = {};

    for (const node of sorted) {
      const name = node['name'];
      hierarchy[name] = {
        name,
        parent: hierarchy[node['parent']]
      };
    }

    return hierarchy;
  }



  /*
   * Instance properties
   */
  graclHierarchy: gracl.Graph;
  outgoingLinkPaths: Hash<Hash<string>>;
  unsecuredCollections = new Set([
    PermissionsModel.def.name,
    PermissionLocks.def.name
  ]);



  // bind static methods to instance as well
  isAllowed           = GraclPlugin.isAllowed;
  setPermissionAccess = GraclPlugin.setPermissionAccess;
  deletePermissions   = GraclPlugin.deletePermissions;
  explainPermission   = GraclPlugin.explainPermission;


  // plugin options
  verbose = false;
  permissionHierarchy: permissionHierarchy;
  permissionProperty: string;
  permissionIdProperty: string;


  permissionTypes: permissionTypeList = [
    { name: 'edit' },
    { name: 'view', parent: 'edit' },
    { name: 'delete' }
  ];



  constructor(opts?: pluginOptions) {
    opts = opts || {};

    if (opts.permissionProperty && !/s$/.test(opts.permissionProperty)) {
      throw new Error(`permissionProperty must end with 's' as it is an array of ids.`);
    }

    if (Array.isArray(opts.permissionTypes) && opts.permissionTypes.length) {
      this.permissionTypes = opts.permissionTypes;
    }

    this.verbose = opts.verbose || false;
    this.permissionProperty = opts.permissionProperty || 'graclResourcePermissions';
    this.permissionIdProperty = this.permissionProperty.replace(/s$/, 'Ids');
  };


  makeRepository(collection: Tyr.CollectionInstance): gracl.Repository {
    const permissionIds = this.permissionIdProperty;
    return {
      async getEntity(id: string, node: gracl.Node): Promise<Tyr.Document> {
        return <Tyr.Document> (
          await collection.populate(
            permissionIds,
            await collection.byId(id)
          )
        );
      },
      async saveEntity(id: string, doc: Tyr.Document, node: gracl.Node): Promise<Tyr.Document> {
        return PermissionsModel.updatePermissions(doc);
      }
    };
  }


  getPermissionObject(permissionString: string) {
    const [ action, collection ] = permissionString.split('-');
    return this.permissionHierarchy[action];
  }


  nextPermission(permissionString: string) {
    const [ action, collection ] = permissionString.split('-'),
          obj = this.permissionHierarchy[action];

    if (obj && obj['parent']) {
      return `${obj['parent']['name']}-${collection}`;
    }
    return void 0;
  }



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

      this.permissionHierarchy = GraclPlugin.constructPermissionHierarchy(this.permissionTypes);

      Object.assign(Tyr.documentPrototype, GraclPlugin.documentMethods);

      type TyrSchemaGraphObjects = {
        links: Tyr.Field[];
        parents: Tyr.CollectionInstance[];
      };

      const collections = Tyr.collections,
            nodeSet = new Set<string>();

      const graclGraphNodes = {
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
        const linkFields = getCollectionLinksSorted(col, { relate: 'ownedBy', direction: 'outgoing' }),
              permissionsLink = findLinkInCollection(col, PermissionsModel),
              collectionName = col.def.name;

        // if no links at all, skip
        if (!(linkFields.length || permissionsLink)) return;

        // validate that we can only have one parent of each field.
        if (linkFields.length > 1) {
          throw new Error(
            `tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ` +
            `Collection ${collectionName} has multiple fields with outgoing ownedBy relations.`
          );
        }

        const [ field ] = linkFields;
        let { graclType } = field ? field.def : permissionsLink.def;

        // if no graclType property on this collection, skip the collection
        if (!graclType) return;

        if (!(permissionsLink && permissionsLink.name === this.permissionIdProperty)) {
          throw new Error(
            `Tyranid collection \"${col.def.name}\" has \"graclType\" annotation but no ` +
            `\"${this.permissionIdProperty}\" field. ` +
            `tyranid-gracl requires a field on secured collections of type: \n` +
            `\"${this.permissionIdProperty}: { is: 'array', link: 'graclPermission' }\"`
          );
        }

        // validate gracl type
        if (!Array.isArray(graclType)) {
          graclType = [ graclType ];
        }

        // if there is a gracl link field, validate that the link collection has permissions set on it, if
        // the gracl type for the link is a resource
        if (field && _.contains(graclType, 'resource')) {
          const linkCollectionPermissionsLink = findLinkInCollection(field.link, PermissionsModel);
          if (!linkCollectionPermissionsLink) {
            throw new Error(
              `Collection ${col.def.name} has a resource link to collection ${field.link.def.name} ` +
              `but ${field.link.def.name} has no permissionIds field!`
            );
          }
        }

        let currentType: string;
        while (currentType = graclType.pop()) {
          switch (currentType) {
            case 'subject':
              if (field) {
                graclGraphNodes.subjects.links.push(field);
                graclGraphNodes.subjects.parents.push(field.link);
              } else {
                graclGraphNodes.subjects.parents.push(col);
              }
              break;
            case 'resource':
              if (field) {
                graclGraphNodes.resources.links.push(field);
                graclGraphNodes.resources.parents.push(field.link);
              } else {
                graclGraphNodes.resources.parents.push(col);
              }
              break;
            default:
              throw new Error(`Invalid gracl node type set on collection ${collectionName}, type = ${graclType}`);
          }
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
          tyrObjects = graclGraphNodes.subjects;
        } else {
          nodes = schemaMaps.resources;
          tyrObjects = graclGraphNodes.resources;
        }

        for (const node of tyrObjects.links) {
          const name = node.collection.def.name,
                parentName = node.link.def.name,
                parentNamePath = node.collection.parsePath(node.path);

          /**
           * Create node in Gracl graph with a custom getParents() method
           */
          nodes.set(name, {
            name,
            id: '$uid',
            parent: parentName,
            permissionProperty: this.permissionProperty,
            repository: this.makeRepository(node.collection),
            async getParents(): Promise<gracl.Node[]> {
              const thisNode = <gracl.Node> this;

              let ids: any = parentNamePath.get(thisNode.doc);

              if (!(ids instanceof Array)) {
                ids = [ ids ];
              }

              const linkCollection = node.link,
                    parentObjects  = await linkCollection.find({
                                        [linkCollection.def.primaryKey.field]: { $in: ids }
                                     }),
                    ParentClass    = thisNode.getParentClass();

              return parentObjects.map(doc => new ParentClass(doc));
            }
          });
        }

        for (const parent of tyrObjects.parents) {
          const name = parent.def.name;
          if (!nodes.has(name)) {
            nodes.set(name, {
              name,
              id: '$uid',
              permissionProperty: this.permissionProperty,
              repository: this.makeRepository(parent)
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

      if (this.verbose) {
        this.logHierarchy();
      }

    }
  }



  /**
   *  Display neatly formatted view of permissions hierarchy
   */
  logHierarchy() {
    console.log(`created gracl permissions hierarchy based on tyranid schemas: `);
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



  /**
   *  Method for creating a specific query based on a schema object
   */
  async query(queriedCollection: Tyr.CollectionInstance,
              permissionAction: string,
              subjectDocument = Tyr.local.user): Promise<boolean | {}> {

    const queriedCollectionName = queriedCollection.def.name;

    if (this.unsecuredCollections.has(queriedCollectionName)) {
      this.log(`skipping query modification for ${queriedCollectionName} as it is flagged as unsecured`);
      return {};
    }

    const permissionType = `${permissionAction}-${queriedCollectionName}`;

    if (!permissionAction) {
      throw new Error(`No permissionAction given to GraclPlugin.query()`);
    }

    if (!this.graclHierarchy) {
      throw new Error(`Must call GraclPlugin.boot() before using GraclPlugin.query()`);
    }

    // if no subjectDocument, no restriction...
    if (!subjectDocument) {
      this.log(`No subjectDocument passed to GraclPlugin.query() (or found on Tyr.local) -- no documents allowed`);
      return false;
    }

    if (!this.graclHierarchy.resources.has(queriedCollectionName)) {
      this.log(
        `Querying against collection (${queriedCollectionName}) with no resource class -- no restriction enforced`
      );
      return {};
    }

    const permissionActions = [ permissionAction ];
    let next = permissionType;
    while (next = this.nextPermission(next)) {
      permissionActions.push(next.split('-')[0]);
    }


    /**
     *  Iterate through permissions action hierarchy, getting access
     */
    const getAccess = (permission: gracl.Permission) => {
      let perm: boolean;
      for (const action of permissionActions) {
        const type = `${action}-${queriedCollectionName}`;
        if (permission.access[type] === true) {
          // short circuit on true
          return true;
        } else if (permission.access[type] === false) {
          // continue on false, as superior permissions may be true
          perm = false;
        }
      }
      return perm;
    };


    // extract subject and resource Gracl classes
    const ResourceClass = this.graclHierarchy.getResource(queriedCollectionName),
          SubjectClass  = this.graclHierarchy.getSubject(subjectDocument.$model.def.name),
          subject       = new SubjectClass(subjectDocument);

    this.log(
      `restricting query for collection = ${queriedCollectionName} ` +
      `permissionType = ${permissionType} ` +
      `subject = ${subject.toString()}`
    );

    const errorMessageHeader = (
      `Unable to construct query object for ${queriedCollection.name} ` +
      `from the perspective of ${subject.toString()}`
    );

    // get list of all ids in the subject hierarchy,
    // as well as the names of the classes in the resource hierarchy
    const subjectHierarchyIds      = await subject.getHierarchyIds(),
          resourceHierarchyClasses = ResourceClass.getHierarchyClassNames(),
          permissionsQuery = {
            subjectId:    { $in: subjectHierarchyIds },
            resourceType: { $in: resourceHierarchyClasses }
          },
          permissions = await PermissionsModel.find(permissionsQuery);

    // no permissions found, return no restriction
    if (!Array.isArray(permissions) || permissions.length === 0) {
      this.log(`No permissions found, returning false`);
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
      if (queriedCollectionLinkFields.has(collectionName) ||
          queriedCollectionName === collectionName) {

        for (const permission of permissions.values()) {
          const access = getAccess(permission);
          switch (access) {
            // access needs to be exactly true or false
            case true:
            case false:
              const key = (access ? 'positive' : 'negative');
              if (!queryMaps[key].has(collectionName)) {
                queryMaps[key].set(collectionName, new Set());
              }
              queryMaps[key].get(collectionName).add(Tyr.parseUid(permission.resourceId).id);
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
            `Path returned for collection pair ${queriedCollectionName} and ${collectionName} is invalid`
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
          const access = getAccess(permission);
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

    const restricted: Hash<any> = {},
          hasPositive = !!positiveRestriction['$or'].length,
          hasNegative = !!negativeRestriction['$and'].length;

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

    return <Hash<any>> restricted;
  }



}
