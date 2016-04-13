/// <reference path='../../typings/main.d.ts' />
import Tyr from 'tyranid';
import * as gracl from 'gracl';
import * as _ from 'lodash';
import { PermissionsModel } from '../models/PermissionsModel';
import { documentMethods } from '../documentMethods';
import {
  Hash,
  findLinkInCollection,
  getCollectionLinksSorted,
  createInQueries,
  stepThroughCollectionPath,
  createError
} from '../util';


export type permissionTypeList = {
  [key: string]: any,
  abstract?: boolean,
  collection?: boolean,
  name: string,
  parents?: string[]
}[];


export type permissionHierarchy = Hash<any>;
export type pluginOptions = {
  verbose?: boolean;
  permissionTypes?: permissionTypeList;
  permissionsProperty?: string;
};


export class GraclPlugin {


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


  /*
   * Instance properties
   */
  graclHierarchy: gracl.Graph;
  outgoingLinkPaths: Hash<Hash<string>>;
  unsecuredCollections = new Set([
    PermissionsModel.def.name
  ]);


  // plugin options
  verbose: boolean;
  permissionHierarchy: permissionHierarchy;
  permissionsProperty: string;
  setOfAllPermissions: Set<string>;


  permissionsModel = PermissionsModel;


  permissionTypes: permissionTypeList = [
    { name: 'edit' },
    { name: 'view', parents: [ 'edit' ] },
    { name: 'delete' }
  ];



  constructor(opts?: pluginOptions) {
    opts = opts || {};
    const plugin = this;

    if (Array.isArray(opts.permissionTypes) && opts.permissionTypes.length) {
      plugin.permissionTypes = opts.permissionTypes;
    }

    plugin.verbose = opts.verbose || false;
    plugin.permissionsProperty = opts.permissionsProperty || '_graclResourcePermissions';
  };



  createIndexes() {
    return PermissionsModel.db.createIndex(
      {
        subjectId: 1,
        resourceId: 1
      },
      { unique: true }
    );
  }


  parsePermissionString(perm: string) {
    const plugin = this;
    if (!perm) plugin.error(`Tried to split empty permission!`);

    const [ action, collection ] = perm.split('-');
    return {
      action,
      collection
    };
  }



  error(message: string) {
    createError(message);
  }



  validatePermissionExists(perm: string) {
    const plugin = this;
    if (!perm) plugin.error('no permission given!');

    const components = plugin.parsePermissionString(perm);

    if (!plugin.permissionHierarchy[components.action]) {
      plugin.error(`Invalid permission type: ${components.action}`);
    }

    if (components.collection && !plugin.graclHierarchy.resources.has(components.collection)) {
      plugin.error(
        `Collection "${components.collection}" has no ` +
        `resource class and thus can't be used with permission "${components.action}"`
      );
    }

  }



  formatPermissionType(components: { action: string, collection?: string }) {
    const plugin = this;
    const hierarchyNode = plugin.permissionHierarchy[components.action];
    if (!hierarchyNode) {
      plugin.error(`Invalid permission type: ${components.action}`);
    }

    // if the permission is abstract, it should not be associated with
    // a specific collection, if there is a collection provided and it is not abstract, use it
    if (!hierarchyNode.abstract && components.collection) {
      return `${components.action}-${components.collection}`;
    }

    return components.action;
  }


  /**
   *  Get all children of a permission
   */
  private _permissionChildCache: { [key: string]: string[] } = {};
  getPermissionChildren(perm: string): string[] {
    const plugin = this;
    if (plugin._permissionChildCache[perm]) return plugin._permissionChildCache[perm].slice();

    const {
      action,
      collection
    } = plugin.parsePermissionString(perm);

    if (!plugin.permissionHierarchy[action]) {
      plugin.error(`Permission ${perm} does not exist!`);
    }

    const children: string[] = [];
    for (const alt of plugin.permissionTypes) {
      const name = plugin.formatPermissionType({
        action: alt.name,
        collection: collection
      });

      const parents = plugin.getPermissionParents(name);
      if (parents.indexOf(perm) >= 0) {
        children.push(name);
      }
    }
    return (plugin._permissionChildCache[perm] = _.unique(children)).slice();
  }


  /**
   *  Get all parent permissions of perm
   */
  getPermissionParents(perm: string): string[] {
    const parents: string[] = [],
          plugin = this;

    let nextPermissions = plugin.nextPermissions(perm);
    while (nextPermissions.length) {
      parents.push(...nextPermissions);
      nextPermissions = <string[]> _.chain(nextPermissions)
        .map(p => plugin.nextPermissions(p))
        .flatten()
        .value();
    }
    return _.unique(parents);
  }


  /**
   *  Get a list of all possible permission strings
   */
  private _allPossiblePermissionsCache: string[];
  getAllPossiblePermissionTypes(): string[] {
    const plugin = this;
    if (plugin._allPossiblePermissionsCache) return plugin._allPossiblePermissionsCache.slice();

    const permissionSchema = plugin.permissionTypes;
    const allPermissions: string[] = [];
    const resourceCollections = Array.from(plugin.graclHierarchy.resources.keys());

    for (const perm of permissionSchema) {
      if (perm.abstract || perm.collection) {
        allPermissions.push(perm.name);
      } else {
        for (const resourceCollection of resourceCollections) {
          const formatted = plugin.formatPermissionType({
            action: perm.name,
            collection: resourceCollection
          });
          allPermissions.push(formatted);
        }
      }
    }

    return (plugin._allPossiblePermissionsCache = _.unique(allPermissions)).slice();
  }



  /**
   * validate and insert provided permissionHierarchy into model
   */
  constructPermissionHierarchy(permissionsTypes: permissionTypeList ): permissionHierarchy {
    const plugin = this;

    if (!plugin.graclHierarchy) {
      plugin.error(`Must build subject/resource hierarchy before creating permission hierarchy`);
    }

    /**
     * Run topological sort on permissions values,
       checking for circular dependencies / missing nodes
     */
    const sorted = gracl.topologicalSort(_.map(permissionsTypes, perm => {

      if (perm['abstract'] === undefined && !perm['collection']) {
        plugin.error(
          `Must set { abstract: true | false } property for all permission types ` +
          `unless it is a collection-specific permission ` +
          `permission ${JSON.stringify(perm)} does not have "abstract" or "collection" property`
        );
      }

      const singleParent = perm['parent'];
      if (singleParent) perm['parents'] = [ singleParent ];

      /**
       *  Check for non-abstract permissions (as parents) which will not have a
          node listed in the permissionType list, but whose "action" should
          be a node in the list.
       */
      const parents = perm['parents'];
      if (parents) {
        if (!Array.isArray(parents)) {
          plugin.error(`parents of permission type must be given as an array!`);
        }

        const colParents = <string[]> [];
        for (const parent of parents) {
          // if we have an <action>-<collection> permission...
          if (/-/.test(parent)) {
            if (!perm['abstract'] && !perm['collection']) {
              plugin.error(
                `Cannot set collection-specific permission to be the parent of a non-abstract permission!`
              );
            }

            const parsed = plugin.parsePermissionString(parent);

            if (!plugin.graclHierarchy.resources.has(parsed.collection)) {
              plugin.error(
                `Collection ${parsed.collection} in permission ` +
                `"${parent}" does not exist in the resource hierarchy!`
              );
            }

            // add it to the list of parents of this nodes, to insure the action
            // is a listed valid permission given to the plugin
            colParents.push(parsed.action);
          } else {
            colParents.push(parent);
          }
        }
        perm['collection_parents'] = _.unique(colParents);
      }

      return perm;
    }), 'name', 'collection_parents');

    const duplicates = new Set(),
          exist = new Set();

    for (const perm of sorted) {
      if (exist.has(perm['name'])) {
        duplicates.add(perm['name']);
      }
      exist.add(perm['name']);
    }

    if (duplicates.size) {
      plugin.error(`Duplicate permission types provided: ${[...duplicates].join(', ')}`);
    }

    const hierarchy: permissionHierarchy = {};

    for (const node of sorted) {
      const name = node['name'],
            parents = <string[]> node['parents'],
            abstract = node['abstract'],
            collection = node['collection'];

      hierarchy[name] = {
        name,
        abstract: abstract,
        collection: collection,
        // need to add parents, that may be non-abstract nodes that don't directly exist in hierarchy
        parents: _.map(parents, (p: string) => {
          const hierarchyParent = hierarchy[p];

          if (abstract && hierarchyParent && !hierarchyParent.abstract) {
            plugin.error(
              `If a permission is abstract, it either needs an abstract parent ` +
              `or a parent that references a specific collection.`
            );
          }

          if (hierarchyParent) return hierarchyParent;

          const parsed = plugin.parsePermissionString(p);

          if (abstract && !parsed.collection) {
            plugin.error(
              `Parent permissions of abstract permission must ` +
              `themseleves be abstract or reference a specific collection. ` +
              `Abstract permission ${name} has parent permission ${p} which is not specific to a collection`
            );
          }

          if (!plugin.graclHierarchy.resources.has(parsed.collection)) {
            plugin.error(
              `Collection ${parsed.collection} in permission ` +
              `"${p}" does not exist in the resource hierarchy!`
            );
          }

          return {
            name: p,
            parents: [
              // the non-abstract parent, must itself have a parent in the hierarchy...
              hierarchy[parsed.action]
            ]
          };
        })
      };
    }

    return hierarchy;
  }


  makeRepository(collection: Tyr.CollectionInstance, graclType: string): gracl.Repository {
    const plugin = this;
    if (graclType !== 'resources' && graclType !== 'subjects') {
      throw new TypeError(`graclType must be subjects or resources, given ${graclType}`);
    }
    return {

      async getEntity(id: string, node: gracl.Node): Promise<Tyr.Document> {
        let doc = await collection.byId(id);
        if (graclType === 'resouces' && !doc[plugin.permissionsProperty]) {
          doc = await PermissionsModel.populatePermissions(doc);
        }
        return doc;
      },

      async saveEntity(id: string, doc: Tyr.Document, node: gracl.Node): Promise<Tyr.Document> {
        await doc.$save();
        if (graclType === 'resouces' && !doc[plugin.permissionsProperty]) {
          doc = await PermissionsModel.populatePermissions(doc);
        }
        return doc;
      }

    };
  }


  getPermissionObject(permissionString: string) {
    const plugin = this;
    return plugin.permissionHierarchy[plugin.parsePermissionString(permissionString).action];
  }


  nextPermissions(permissionString: string): string[] {
    const plugin = this;
    const components = plugin.parsePermissionString(permissionString),
          // get general permissions from action
          actionParents = <Hash<string>[]> _.get(
            plugin.permissionHierarchy,
            `${components.action}.parents`,
            []
          ),
          // if a specific action-collection permission is set in the hierarchy
          permissionStringParents = <Hash<string>[]> _.get(
            plugin.permissionHierarchy,
            `${permissionString}.parents`,
            []
          );

    return _.chain(actionParents)
      .concat(permissionStringParents)
      .map('name')
      .unique()
      .map((name: string) => {
        // we need to split the name, as it may include a specific collection
        // for inheritance
        const parentPermComponents = plugin.parsePermissionString(name);

        return plugin.formatPermissionType({
          action: parentPermComponents.action,
          // if there was a specific collection attached to the parent permission
          // use that, otherwise use the same collection as the last permission
          collection: parentPermComponents.collection || components.collection
        });
      })
      .unique()
      .value();
  }



  log(message: string) {
    const plugin = this;
    if (plugin.verbose) {
      console.log(`tyranid-gracl: ${message}`);
    }
    return this;
  }



  getObjectHierarchy() {
    const plugin = this,
          hierarchy = {
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

    plugin.graclHierarchy.subjects.forEach(build(hierarchy.subjects));
    plugin.graclHierarchy.resources.forEach(build(hierarchy.resources));
    return hierarchy;
  }



  /**
   *  Construct a path from collection a to collection b using
      the pre-computed paths in GraclPlugin.outgoingLinkPaths
   */
  getShortestPath(colA: Tyr.CollectionInstance, colB: Tyr.CollectionInstance) {
    let plugin = this,
        a = colA.def.name,
        b = colB.def.name,
        originalEdge = `${a}.${b}`,
        next = plugin.outgoingLinkPaths;

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
      const plugin = this;

      plugin.log(`starting boot.`);

      const tyranidDocumentPrototype = <{ [key: string]: any }> Tyr.documentPrototype;

      for (const method in documentMethods) {
        if (documentMethods.hasOwnProperty(method)) {
          if (tyranidDocumentPrototype[method]) {
            plugin.error(
              `tyranid-gracl: tried to set method ${method} on document prototype, but it already exists!`
            );
          }
          tyranidDocumentPrototype[method] = (<any> documentMethods)[method];
        }
      }

      type TyrSchemaGraphObjects = {
        links: Tyr.Field[];
        parents: Tyr.CollectionInstance[];
      };

      const collections = Tyr.collections,
            nodeSet     = new Set<string>();

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

      const permissionsProperty = plugin.permissionsProperty;

      // loop through all collections, retrieve
      // ownedBy links
      collections.forEach(col => {
        const linkFields = getCollectionLinksSorted(col, { relate: 'ownedBy', direction: 'outgoing' }),
              graclTypeAnnotation = col.def['graclType'],
              collectionName = col.def.name;

        // if no links at all, skip
        if (!(linkFields.length || graclTypeAnnotation)) return;

        // validate that we can only have one parent of each field.
        if (linkFields.length > 1) {
          plugin.error(
            `tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ` +
            `Collection ${collectionName} has multiple fields with outgoing ownedBy relations.`
          );
        }

        const [ field ] = linkFields;
        let { graclType } = field ? field.def : col.def;

        // if no graclType property on this collection, skip the collection
        if (!graclType) return;

        // validate gracl type
        if (!Array.isArray(graclType)) {
          graclType = [ graclType ];
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
              plugin.error(`Invalid gracl node type set on collection ${collectionName}, type = ${graclType}`);
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
            permissionProperty: plugin.permissionsProperty,
            repository: plugin.makeRepository(node.collection, type),
            async getParents(): Promise<gracl.Node[]> {
              const thisNode = <gracl.Node> this,
                    ParentClass = thisNode.getParentClass();

              let ids: any = parentNamePath.get(thisNode.doc);

              if (ids && !(ids instanceof Array)) {
                ids = [ ids ];
              }

              // if no immediate parents, recurse
              // up resource chain and check for
              // alternate path to current node
              if (!(ids && ids.length)) {
                const hierarchyClasses = ParentClass.getHierarchyClassNames(),
                      thisCollection = Tyr.byName[thisNode.getName()],
                      doc = <Tyr.Document> thisNode.doc;

                hierarchyClasses.shift(); // remove parent we already tried

                // try to find a path between one of the hierarchy classes
                // (starting from lowest and recursing upward)
                let currentParent: string;
                while (currentParent = hierarchyClasses.shift()) {
                  const currentParentCollection = Tyr.byName[currentParent],
                        path = plugin.getShortestPath(thisCollection, currentParentCollection),
                        CurrentParentNodeClass = type === 'resources'
                          ? plugin.graclHierarchy.getResource(currentParent)
                          : plugin.graclHierarchy.getSubject(currentParent);

                  if (path.length && path.length >= 2) {
                    let currentCollection = Tyr.byName[path.shift()],
                        nextCollection = Tyr.byName[path.shift()],
                        linkField = findLinkInCollection(currentCollection, nextCollection);

                    const idProp = linkField.namePath.get(doc) || [];

                    let ids: string[] = !idProp
                      ? []
                      : (Array.isArray(idProp) ? idProp : [ idProp ]);

                    // this potential path has found a dead end,
                    // we need to try another upper level resource
                    if (!ids.length) continue;

                    while (linkField.link.def.name !== currentParent) {
                      currentCollection = nextCollection;
                      nextCollection = Tyr.byName[path.shift()];
                      linkField = findLinkInCollection(currentCollection, nextCollection);
                      const nextDocuments = await currentCollection.byIds(ids);
                      ids = <string[]> _.chain(nextDocuments)
                        .map(d => linkField.namePath.get(d))
                        .flatten()
                        .compact()
                        .value();
                    }

                    if (!ids.length) continue;

                    const parentDocs = await nextCollection.byIds(ids),
                          populated = await Promise.all(parentDocs.map(PermissionsModel.populatePermissions)),
                          parents = populated.map(d => new CurrentParentNodeClass(d));

                    return parents;
                  }
                }

                return [];
              }

              const linkCollection = node.link,
                    parentObjects  = await linkCollection.findAll({
                                        [linkCollection.def.primaryKey.field]: { $in: ids }
                                     });

              const populated = await Promise.all(parentObjects.map(PermissionsModel.populatePermissions));

              return populated.map(doc => new ParentClass(doc));
            }
          });
        }

        for (const parent of tyrObjects.parents) {
          const name = parent.def.name;
          if (!nodes.has(name)) {
            nodes.set(name, {
              name,
              id: '$uid',
              permissionProperty: plugin.permissionsProperty,
              repository: plugin.makeRepository(parent, type)
            });
          }
        }

      }

      plugin.log(`creating link graph.`);
      plugin.outgoingLinkPaths = GraclPlugin.buildLinkGraph();

      plugin.graclHierarchy = new gracl.Graph({
        subjects: Array.from(schemaMaps.subjects.values()),
        resources: Array.from(schemaMaps.resources.values())
      });

      if (plugin.verbose) {
        plugin.logHierarchy();
      }

      plugin.permissionHierarchy = plugin.constructPermissionHierarchy(plugin.permissionTypes);
      plugin.setOfAllPermissions = new Set(plugin.getAllPossiblePermissionTypes());
    }
  }



  /**
   *  Display neatly formatted view of permissions hierarchy
   */
  logHierarchy() {
    const plugin = this;
    console.log(`created gracl permissions hierarchy based on tyranid schemas: `);
    console.log(
      '  | \n  | ' +
      JSON
        .stringify(plugin.getObjectHierarchy(), null, 4)
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
              permissionType: string,
              subjectDocument = Tyr.local.user): Promise<boolean | {}> {

    const queriedCollectionName = queriedCollection.def.name,
          plugin = this;

    if (plugin.unsecuredCollections.has(queriedCollectionName)) {
      plugin.log(`skipping query modification for ${queriedCollectionName} as it is flagged as unsecured`);
      return {};
    }

    if (!permissionType) {
      plugin.error(`No permissionType given to GraclPlugin.query()`);
    }

    if (!plugin.graclHierarchy) {
      plugin.error(`Must call GraclPlugin.boot() before using GraclPlugin.query()`);
    }

    const components = plugin.parsePermissionString(permissionType);

    permissionType = plugin.formatPermissionType({
      action: components.action,
      collection: components.collection || queriedCollectionName
    });

    // if no subjectDocument, no restriction...
    if (!subjectDocument) {
      plugin.log(`No subjectDocument passed to GraclPlugin.query() (or found on Tyr.local) -- no documents allowed`);
      return false;
    }

    if (!subjectDocument.$model) {
      plugin.error(
        `The subjectDocument passed to GraclPlugin.query() must be a tyranid document!`
      );
    }

    if (!plugin.graclHierarchy.resources.has(queriedCollectionName)) {
      plugin.log(
        `Querying against collection (${queriedCollectionName}) with no resource class -- no restriction enforced`
      );
      return {};
    }

    // get all permission actions in order...
    const permissionTypes = [ permissionType ].concat(plugin.getPermissionParents(permissionType));

    /**
     *  Iterate through permissions action hierarchy, getting access
     */
    const getAccess = (permission: gracl.Permission) => {
      let perm: boolean;
      for (const type of permissionTypes) {

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
    const ResourceClass = plugin.graclHierarchy.getResource(queriedCollectionName),
          SubjectClass  = plugin.graclHierarchy.getSubject(subjectDocument.$model.def.name),
          subject       = new SubjectClass(subjectDocument);

    plugin.log(
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
            resourceType: { $in: resourceHierarchyClasses },
            $or: permissionTypes.map(perm => {
              return {
                [`access.${perm}`]: { $exists: true }
              };
            })
          };

    const permissions = await PermissionsModel.findAll(permissionsQuery);

    // no permissions found, return no restriction
    if (!Array.isArray(permissions) || permissions.length === 0) {
      plugin.log(`No permissions found, returning false`);
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


    const resourceArray = Array.from(resourceMap.values());
    resourceArray.sort((a, b) => {
      const aDepth = plugin.graclHierarchy.getResource(a.collection.def.name).getNodeDepth();
      const bDepth = plugin.graclHierarchy.getResource(b.collection.def.name).getNodeDepth();
      return gracl.baseCompare(bDepth, aDepth);
    });


    const alreadySet = new Set<string>();

    // extract all collections that have a relevant permission set for the requested resource
    for (const { collection, permissions } of resourceArray) {
      const collectionName = collection.def.name;

      let queryRestrictionSet = false;
      if (queriedCollectionLinkFields.has(collectionName) ||
          queriedCollectionName === collectionName) {

        for (const permission of permissions.values()) {
          const access = getAccess(permission);
          switch (access) {
            // access needs to be exactly true or false
            case true:
            case false:
              // if a permission was set by a collection of higher depth, keep it...
              if (alreadySet.has(permission.resourceId)) {
                continue;
              } else {
                alreadySet.add(permission.resourceId);
              }
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
        const path = plugin.getShortestPath(queriedCollection, collection);

        if (!path.length) {
          plugin.error(
            `${errorMessageHeader}, as there is no path between ` +
            `collections ${queriedCollectionName} and ${collectionName} in the schema.`
          );
        }

        // remove end of path (which should equal the collection of interest on the permission)
        const pathEndCollectionName = path.pop();

        if (collectionName !== pathEndCollectionName) {
          plugin.error(
            `Path returned for collection pair ${queriedCollectionName} and ${collectionName} is invalid`
          );
        }

        // assert that the penultimate path collection exists as a link on the queriedCollection
        if (!queriedCollectionLinkFields.has(path[1])) {
          plugin.error(
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
            plugin.error(
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

          const resourceUid = Tyr.byName[linkedCollectionName].idToUid(id);
          if (alreadySet.has(resourceUid)) {
            return;
          } else {
            alreadySet.add(resourceUid);
          }

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
        plugin.error(
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
