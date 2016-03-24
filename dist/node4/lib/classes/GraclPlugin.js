"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }
        function rejected(value) {
            try {
                step(generator.throw(value));
            } catch (e) {
                reject(e);
            }
        }
        function step(result) {
            result.done ? resolve(result.value) : new P(function (resolve) {
                resolve(result.value);
            }).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Tyr = require('tyranid');
const gracl = require('gracl');
const _ = require('lodash');
const PermissionsModel_1 = require('../models/PermissionsModel');
const PermissionsLocks_1 = require('../models/PermissionsLocks');
const util_1 = require('../util');
class GraclPlugin {
    constructor() {
        let verbose = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

        this.verbose = verbose;
        this.unsecuredCollections = new Set([PermissionsModel_1.PermissionsModel.def.name, PermissionsLocks_1.PermissionLocks.def.name]);
    }
    static makeRepository(collection) {
        return {
            getEntity(id, node) {
                return __awaiter(this, void 0, Promise, function* () {
                    return yield collection.populate('permissionIds', (yield collection.byId(id)));
                });
            },
            saveEntity(id, doc, node) {
                return __awaiter(this, void 0, Promise, function* () {
                    return PermissionsModel_1.PermissionsModel.updatePermissions(doc);
                });
            }
        };
    }
    static buildLinkGraph() {
        const g = {};
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
        const dist = {},
              next = {},
              keys = _.keys(g);
        _.each(keys, a => {
            _.each(keys, b => {
                _.set(dist, `${ a }.${ b }`, Infinity);
            });
        });
        _.each(keys, a => {
            _.set(dist, `${ a }.${ a }`, 0);
        });
        _.each(keys, a => {
            _.each(keys, b => {
                if (g[a].has(b)) {
                    _.set(dist, `${ a }.${ b }`, 1);
                    _.set(next, `${ a }.${ b }`, b);
                }
            });
        });
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

    log(message) {
        if (this.verbose) {
            console.log(`tyranid-gracl: ${ message }`);
        }
        return this;
    }
    getObjectHierarchy() {
        const hierarchy = {
            subjects: {},
            resources: {}
        };
        const build = obj => node => {
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
    getShortestPath(colA, colB) {
        let a = colA.def.name,
            b = colB.def.name,
            originalEdge = `${ a }.${ b }`,
            next = this.outgoingLinkPaths;
        if (!_.get(next, originalEdge)) return [];
        const path = [a];
        while (a !== b) {
            a = _.get(next, `${ a }.${ b }`);
            if (!a) return [];
            path.push(a);
        }
        return path;
    }
    boot(stage) {
        if (stage === 'post-link') {
            this.log(`starting boot.`);
            Object.assign(Tyr.documentPrototype, GraclPlugin.documentMethods);
            const collections = Tyr.collections,
                  nodeSet = new Set();
            const graclGraphNodes = {
                subjects: {
                    links: [],
                    parents: []
                },
                resources: {
                    links: [],
                    parents: []
                }
            };
            collections.forEach(col => {
                const linkFields = col.links({ relate: 'ownedBy', direction: 'outgoing' }),
                      collectionName = col.def.name;
                if (!linkFields.length) return;
                if (linkFields.length > 1) {
                    throw new Error(`tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ` + `Collection ${ collectionName } has multiple fields with outgoing ownedBy relations.`);
                }

                var _linkFields = _slicedToArray(linkFields, 1);

                const field = _linkFields[0];
                let graclType = field.def.graclType;

                if (!graclType) return;
                const allOutgoingFields = col.links({ direction: 'outgoing' }),
                      validateField = f => {
                    return f.def.link === 'graclPermission' && f.name === 'permissionIds';
                };
                if (!_.find(allOutgoingFields, validateField)) {
                    throw new Error(`Tyranid collection \"${ col.def.name }\" has \"graclType\" annotation but no \"permissionIds\" field. ` + `tyranid-gracl requires a field on secured collections of type: \n` + `\"permissionIds: { is: 'array', link: 'graclPermission' }\"`);
                }
                if (!Array.isArray(graclType)) {
                    graclType = [graclType];
                }
                let currentType;
                while (currentType = graclType.pop()) {
                    switch (currentType) {
                        case 'subject':
                            graclGraphNodes.subjects.links.push(field);
                            graclGraphNodes.subjects.parents.push(field.link);
                            break;
                        case 'resource':
                            graclGraphNodes.resources.links.push(field);
                            graclGraphNodes.resources.parents.push(field.link);
                            break;
                        default:
                            throw new Error(`Invalid gracl node type set on collection ${ collectionName }, type = ${ graclType }`);
                    }
                }
            });
            const schemaMaps = {
                subjects: new Map(),
                resources: new Map()
            };
            for (const type of ['subjects', 'resources']) {
                let nodes, tyrObjects;
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
                    nodes.set(name, {
                        name: name,
                        id: '$uid',
                        parent: parentName,
                        repository: GraclPlugin.makeRepository(node.collection),
                        getParents() {
                            return __awaiter(this, void 0, Promise, function* () {
                                const thisNode = this;
                                let ids = parentNamePath.get(thisNode.doc);
                                if (!(ids instanceof Array)) {
                                    ids = [ids];
                                }
                                const linkCollection = node.link,
                                      parentObjects = yield linkCollection.find({
                                    [linkCollection.def.primaryKey.field]: { $in: ids }
                                }, null, { tyranid: { insecure: true } }),
                                      ParentClass = thisNode.getParentClass();
                                return parentObjects.map(doc => new ParentClass(doc));
                            });
                        }
                    });
                }
                for (const parent of tyrObjects.parents) {
                    const name = parent.def.name;
                    if (!nodes.has(name)) {
                        nodes.set(name, {
                            name: name,
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
            if (this.verbose) {
                this.logHierarchy();
            }
        }
    }
    logHierarchy() {
        console.log(`created gracl permissions hierarchy based on tyranid schemas: `);
        console.log('  | \n  | ' + JSON.stringify(this.getObjectHierarchy(), null, 4).replace(/[{},\":]/g, '').replace(/^\s*\n/gm, '').split('\n').join('\n  | ').replace(/\s+$/, '').replace(/resources/, '---- resources ----').replace(/subjects/, '---- subjects ----') + '____');
    }
    query(queriedCollection, permissionAction) {
        let subjectDocument = arguments.length <= 2 || arguments[2] === undefined ? Tyr.local.user : arguments[2];

        return __awaiter(this, void 0, Promise, function* () {
            const queriedCollectionName = queriedCollection.def.name;
            if (this.unsecuredCollections.has(queriedCollectionName)) {
                this.log(`skipping query modification for ${ queriedCollectionName } as it is flagged as unsecured`);
                return {};
            }
            const permissionType = `${ permissionAction }-${ queriedCollectionName }`;
            if (!permissionAction) {
                throw new Error(`No permissionAction given to GraclPlugin.query()`);
            }
            if (!this.graclHierarchy) {
                throw new Error(`Must call GraclPlugin.boot() before using GraclPlugin.query()`);
            }
            if (!subjectDocument) {
                this.log(`No subjectDocument passed to GraclPlugin.query() (or found on Tyr.local) -- no documents allowed`);
                return false;
            }
            if (!this.graclHierarchy.resources.has(queriedCollectionName)) {
                this.log(`Querying against collection (${ queriedCollectionName }) with no resource class -- no restriction enforced`);
                return {};
            }
            const ResourceClass = this.graclHierarchy.getResource(queriedCollectionName),
                  SubjectClass = this.graclHierarchy.getSubject(subjectDocument.$model.def.name),
                  subject = new SubjectClass(subjectDocument);
            this.log(`restricting query for collection = ${ queriedCollectionName } ` + `permissionType = ${ permissionType } ` + `subject = ${ subject.toString() }`);
            const errorMessageHeader = `Unable to construct query object for ${ queriedCollection.name } ` + `from the perspective of ${ subject.toString() }`;
            const subjectHierarchyIds = yield subject.getHierarchyIds(),
                  resourceHierarchyClasses = ResourceClass.getHierarchyClassNames(),
                  permissionsQuery = {
                subjectId: { $in: subjectHierarchyIds },
                resourceType: { $in: resourceHierarchyClasses }
            },
                  permissions = yield PermissionsModel_1.PermissionsModel.find(permissionsQuery, null, { tyranid: { insecure: true } });
            if (!Array.isArray(permissions) || permissions.length === 0) {
                this.log(`No permissions found, returning false`);
                return false;
            }
            const resourceMap = permissions.reduce((map, perm) => {
                const resourceCollectionName = perm['resourceType'],
                      resourceId = perm['resourceId'];
                if (!map.has(resourceCollectionName)) {
                    map.set(resourceCollectionName, {
                        collection: Tyr.byName[resourceCollectionName],
                        permissions: new Map()
                    });
                }
                map.get(resourceCollectionName).permissions.set(resourceId, perm);
                return map;
            }, new Map());
            const queriedCollectionLinkFields = util_1.getCollectionLinksSorted(queriedCollection).reduce((map, field) => {
                map.set(field.def.link, field);
                return map;
            }, new Map());
            const queryMaps = {
                positive: new Map(),
                negative: new Map()
            };
            for (const _ref of resourceMap) {
                var _ref2 = _slicedToArray(_ref, 2);

                const collectionName = _ref2[0];
                var _ref2$ = _ref2[1];
                const collection = _ref2$.collection;
                const permissions = _ref2$.permissions;

                let queryRestrictionSet = false;
                if (queriedCollectionLinkFields.has(collectionName) || queriedCollectionName === collectionName) {
                    for (const permission of permissions.values()) {
                        const access = permission.access[permissionType];
                        switch (access) {
                            case true:
                            case false:
                                const key = access ? 'positive' : 'negative';
                                if (!queryMaps[key].has(collectionName)) {
                                    queryMaps[key].set(collectionName, new Set());
                                }
                                queryMaps[key].get(collectionName).add(permission.resourceId);
                                break;
                        }
                        queryRestrictionSet = true;
                    }
                } else {
                    const path = this.getShortestPath(queriedCollection, collection);
                    if (!path.length) {
                        throw new Error(`${ errorMessageHeader }, as there is no path between ` + `collections ${ queriedCollectionName } and ${ collectionName } in the schema.`);
                    }
                    const pathEndCollectionName = path.pop();
                    if (collectionName !== pathEndCollectionName) {
                        throw new Error(`Path returned for collection pair ${ queriedCollectionName } and ${ collectionName } is invalid`);
                    }
                    if (!queriedCollectionLinkFields.has(path[1])) {
                        throw new Error(`Path returned for collection pair ${ queriedCollectionName } and ${ collectionName } ` + `must have the penultimate path exist as a link on the collection being queried, ` + `the penultimate collection path between ${ queriedCollectionName } and ${ collectionName } ` + `is ${ path[1] }, which is not linked to by ${ queriedCollectionName }`);
                    }
                    let positiveIds = [],
                        negativeIds = [];
                    for (const permission of permissions.values()) {
                        const access = permission.access[permissionType];
                        switch (access) {
                            case true:
                                positiveIds.push(Tyr.parseUid(permission.resourceId).id);
                                break;
                            case false:
                                negativeIds.push(Tyr.parseUid(permission.resourceId).id);
                                break;
                        }
                    }
                    const pathEndCollection = Tyr.byName[pathEndCollectionName],
                          nextCollection = Tyr.byName[_.last(path)];
                    positiveIds = yield util_1.stepThroughCollectionPath(positiveIds, pathEndCollection, nextCollection);
                    negativeIds = yield util_1.stepThroughCollectionPath(negativeIds, pathEndCollection, nextCollection);
                    let pathCollectionName, nextCollectionName;
                    while (path.length > 2) {
                        const pathCollection = Tyr.byName[pathCollectionName = path.pop()],
                              nextCollection = Tyr.byName[nextCollectionName = _.last(path)];
                        if (!pathCollection) {
                            throw new Error(`${ errorMessageHeader }, invalid collection name given in path! collection: ${ pathCollectionName }`);
                        }
                        positiveIds = yield util_1.stepThroughCollectionPath(positiveIds, pathCollection, nextCollection);
                        negativeIds = yield util_1.stepThroughCollectionPath(negativeIds, pathCollection, nextCollection);
                    }
                    const linkedCollectionName = nextCollection.def.name;
                    const addIdsToQueryMap = access => id => {
                        const accessString = access ? 'positive' : 'negative',
                              altAccessString = access ? 'negative' : 'positive';
                        if (!queryMaps[accessString].has(linkedCollectionName)) {
                            queryMaps[accessString].set(linkedCollectionName, new Set());
                        }
                        if (!queryMaps[altAccessString].has(linkedCollectionName) || !queryMaps[altAccessString].get(linkedCollectionName).has(id)) {
                            queryMaps[accessString].get(linkedCollectionName).add(id);
                        }
                    };
                    _.each(positiveIds, addIdsToQueryMap(true));
                    _.each(negativeIds, addIdsToQueryMap(false));
                    queryRestrictionSet = true;
                }
                if (!queryRestrictionSet) {
                    throw new Error(`${ errorMessageHeader }, unable to set query restriction ` + `to satisfy permissions relating to collection ${ collectionName }`);
                }
            }
            const positiveRestriction = util_1.createInQueries(queryMaps['positive'], queriedCollection, '$in'),
                  negativeRestriction = util_1.createInQueries(queryMaps['negative'], queriedCollection, '$nin');
            const restricted = {},
                  hasPositive = !!positiveRestriction['$or'].length,
                  hasNegative = !!negativeRestriction['$and'].length;
            if (hasNegative && hasPositive) {
                restricted['$and'] = [positiveRestriction, negativeRestriction];
            } else if (hasNegative) {
                Object.assign(restricted, negativeRestriction);
            } else if (hasPositive) {
                Object.assign(restricted, positiveRestriction);
            }
            return restricted;
        });
    }
}
GraclPlugin.documentMethods = {
    $setPermissionAccess(permissionType, access) {
        let subjectDocument = arguments.length <= 2 || arguments[2] === undefined ? Tyr.local.user : arguments[2];

        const doc = this;
        return PermissionsModel_1.PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
    },
    $isAllowed(permissionType) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? Tyr.local.user : arguments[1];

        const doc = this;
        return PermissionsModel_1.PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
    },
    $allow(permissionType) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? Tyr.local.user : arguments[1];

        return this.$setPermissionAccess(permissionType, true, subjectDocument);
    },
    $deny(permissionType) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? Tyr.local.user : arguments[1];

        return this.$setPermissionAccess(permissionType, false, subjectDocument);
    }
};
exports.GraclPlugin = GraclPlugin;