"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

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
const tyranid_1 = require('tyranid');
const gracl = require('gracl');
const _ = require('lodash');
const PermissionsModel_1 = require('../models/PermissionsModel');
const PermissionsLocks_1 = require('../models/PermissionsLocks');
const util_1 = require('../util');
class GraclPlugin {
    constructor(opts) {
        this.unsecuredCollections = new Set([PermissionsModel_1.PermissionsModel.def.name, PermissionsLocks_1.PermissionLocks.def.name]);
        this.isAllowed = GraclPlugin.isAllowed;
        this.setPermissionAccess = GraclPlugin.setPermissionAccess;
        this.deletePermissions = GraclPlugin.deletePermissions;
        this.explainPermission = GraclPlugin.explainPermission;
        this.permissionTypes = [{ name: 'edit' }, { name: 'view', parents: ['edit'] }, { name: 'delete' }];
        opts = opts || {};
        if (Array.isArray(opts.permissionTypes) && opts.permissionTypes.length) {
            this.permissionTypes = opts.permissionTypes;
        }
        if (opts.permissionIdProperty && !/Ids$/.test(opts.permissionIdProperty)) {
            throw new Error(`permissionIdProperty should end with "Ids", given: ${ opts.permissionIdProperty }`);
        }
        this.verbose = opts.verbose || false;
        this.permissionIdProperty = opts.permissionIdProperty || 'graclResourcePermissionIds';
        this.populatedPermissionsProperty = this.permissionIdProperty + '$';
    }
    static buildLinkGraph() {
        const g = {};
        _.each(tyranid_1.default.collections, col => {
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

    parsePermissionString(perm) {
        if (!perm) throw new Error(`Tried to split empty permission!`);

        var _perm$split = perm.split('-');

        var _perm$split2 = _slicedToArray(_perm$split, 2);

        const action = _perm$split2[0];
        const collection = _perm$split2[1];

        return {
            action: action,
            collection: collection
        };
    }
    formatPermissionType(components) {
        const hierarchyNode = this.permissionHierarchy[components.action];
        if (!hierarchyNode.abstract && components.collection) {
            return `${ components.action }-${ components.collection }`;
        }
        return components.action;
    }
    constructPermissionHierarchy(permissionsTypes) {
        if (!this.graclHierarchy) {
            throw new Error(`Must build subject/resource hierarchy before creating permission hierarchy`);
        }
        const sorted = gracl.topologicalSort(_.map(permissionsTypes, perm => {
            if (perm['abstract'] === undefined) {
                throw new Error(`Must set { abstract: true | false } property for all permission types! ` + `permission ${ JSON.stringify(perm) } does not have \"abstract\" property`);
            }
            const singleParent = perm['parent'];
            if (singleParent) perm['parents'] = [singleParent];
            const parents = perm['parents'];
            if (parents) {
                if (!Array.isArray(parents)) {
                    throw new Error(`parents of permission type must be given as an array!`);
                }
                const colParents = [];
                for (const parent of parents) {
                    if (/-/.test(parent)) {
                        if (!perm['abstract']) {
                            throw new Error(`Cannot set collection-specific permission to be the parent of a non-abstract permission!`);
                        }
                        const parsed = this.parsePermissionString(parent);
                        if (!this.graclHierarchy.resources.has(parsed.collection)) {
                            throw new Error(`Collection ${ parsed.collection } in permission ` + `"${ parent }" does not exist in the resource hierarchy!`);
                        }
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
            throw new Error(`Duplicate permission types provided: ${ [].concat(_toConsumableArray(duplicates)).join(', ') }`);
        }
        const hierarchy = {};
        for (const node of sorted) {
            const name = node['name'],
                  parents = node['parents'],
                  abstract = node['abstract'];
            hierarchy[name] = {
                name: name,
                abstract: abstract,
                parents: _.map(parents, p => {
                    const hierarchyParent = hierarchy[p];
                    if (abstract && hierarchyParent && !hierarchyParent.abstract) {
                        throw new Error(`If a permission is abstract, it either needs an abstract parent ` + `or a parent that references a specific collection.`);
                    }
                    if (hierarchyParent) return hierarchyParent;
                    const parsed = this.parsePermissionString(p);
                    if (abstract && !parsed.collection) {
                        throw new Error(`Parent permissions of abstract permission must ` + `themseleves be abstract or reference a specific collection. ` + `Abstract permission ${ name } has parent permission ${ p } which is not specific to a collection`);
                    }
                    if (!this.graclHierarchy.resources.has(parsed.collection)) {
                        throw new Error(`Collection ${ parsed.collection } in permission ` + `"${ p }" does not exist in the resource hierarchy!`);
                    }
                    return {
                        name: p,
                        parents: [hierarchy[parsed.action]]
                    };
                })
            };
        }
        return hierarchy;
    }
    makeRepository(collection) {
        const permissionIdProperty = this.permissionIdProperty;
        return {
            getEntity(id, node) {
                return __awaiter(this, void 0, Promise, function* () {
                    let doc = yield collection.byId(id);
                    if (doc[permissionIdProperty] && doc[permissionIdProperty][0]) {
                        doc = yield doc.$populate(permissionIdProperty);
                    }
                    return doc;
                });
            },
            saveEntity(id, doc, node) {
                return __awaiter(this, void 0, Promise, function* () {
                    doc = yield PermissionsModel_1.PermissionsModel.updatePermissions(doc);
                    if (doc[permissionIdProperty] && doc[permissionIdProperty][0]) {
                        doc = yield doc.$populate(permissionIdProperty);
                    }
                    return doc;
                });
            }
        };
    }
    getPermissionObject(permissionString) {
        return this.permissionHierarchy[this.parsePermissionString(permissionString).action];
    }
    nextPermissions(permissionString) {
        const components = this.parsePermissionString(permissionString),
              obj = this.permissionHierarchy[components.action];
        let permissions = [];
        if (obj && obj['parents']) {
            permissions = obj['parents'].map(p => {
                const parentPermComponents = this.parsePermissionString(p['name']);
                return this.formatPermissionType({
                    action: parentPermComponents.action,
                    collection: parentPermComponents.collection || components.collection
                });
            });
        }
        return permissions;
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
            Object.assign(tyranid_1.default.documentPrototype, GraclPlugin.documentMethods);
            const collections = tyranid_1.default.collections,
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
            const permissionIdProperty = this.permissionIdProperty;
            collections.forEach(col => {
                const linkFields = util_1.getCollectionLinksSorted(col, { relate: 'ownedBy', direction: 'outgoing' }),
                      permissionsLink = util_1.findLinkInCollection(col, PermissionsModel_1.PermissionsModel),
                      collectionName = col.def.name;
                if (!(linkFields.length || permissionsLink)) return;
                if (linkFields.length > 1) {
                    throw new Error(`tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ` + `Collection ${ collectionName } has multiple fields with outgoing ownedBy relations.`);
                }

                var _linkFields = _slicedToArray(linkFields, 1);

                const field = _linkFields[0];

                var _ref = field ? field.def : permissionsLink.def;

                let graclType = _ref.graclType;

                if (!graclType) return;
                if (!(permissionsLink && permissionsLink.name === this.permissionIdProperty)) {
                    throw new Error(`Tyranid collection \"${ col.def.name }\" has \"graclType\" annotation but no ` + `\"${ this.permissionIdProperty }\" field. ` + `tyranid-gracl requires a field on secured collections of type: \n` + `\"${ this.permissionIdProperty }: { is: 'array', link: 'graclPermission' }\"`);
                }
                if (!Array.isArray(graclType)) {
                    graclType = [graclType];
                }
                if (field && _.contains(graclType, 'resource')) {
                    const linkCollectionPermissionsLink = util_1.findLinkInCollection(field.link, PermissionsModel_1.PermissionsModel);
                    if (!linkCollectionPermissionsLink) {
                        throw new Error(`Collection ${ col.def.name } has a resource link to collection ${ field.link.def.name } ` + `but ${ field.link.def.name } has no ${ this.permissionIdProperty } field!`);
                    }
                }
                let currentType;
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
                        permissionProperty: this.populatedPermissionsProperty,
                        repository: this.makeRepository(node.collection),
                        getParents() {
                            return __awaiter(this, void 0, Promise, function* () {
                                const thisNode = this;
                                let ids = parentNamePath.get(thisNode.doc);
                                if (!(ids instanceof Array)) {
                                    ids = [ids];
                                }
                                const linkCollection = node.link,
                                      parentObjects = yield linkCollection.findAll({
                                    [linkCollection.def.primaryKey.field]: { $in: ids }
                                }),
                                      ParentClass = thisNode.getParentClass();
                                if (!parentObjects.length) return [];
                                const populated = yield linkCollection.populate(permissionIdProperty, parentObjects);
                                return populated.map(doc => new ParentClass(doc));
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
                            permissionProperty: this.populatedPermissionsProperty,
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
            this.permissionHierarchy = this.constructPermissionHierarchy(this.permissionTypes);
        }
    }
    logHierarchy() {
        console.log(`created gracl permissions hierarchy based on tyranid schemas: `);
        console.log('  | \n  | ' + JSON.stringify(this.getObjectHierarchy(), null, 4).replace(/[{},\":]/g, '').replace(/^\s*\n/gm, '').split('\n').join('\n  | ').replace(/\s+$/, '').replace(/resources/, '---- resources ----').replace(/subjects/, '---- subjects ----') + '____');
    }
    query(queriedCollection, permissionAction) {
        let subjectDocument = arguments.length <= 2 || arguments[2] === undefined ? tyranid_1.default.local.user : arguments[2];

        return __awaiter(this, void 0, Promise, function* () {
            const queriedCollectionName = queriedCollection.def.name;
            if (this.unsecuredCollections.has(queriedCollectionName)) {
                this.log(`skipping query modification for ${ queriedCollectionName } as it is flagged as unsecured`);
                return {};
            }
            const permissionType = this.formatPermissionType({
                action: permissionAction,
                collection: queriedCollectionName
            });
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
            const permissionActions = [permissionAction],
                  getNext = n => {
                return _.chain(n).map(p => this.nextPermissions(p)).flatten().value();
            };
            let next = [permissionType];
            while ((next = getNext(next)).length) {
                for (const perm of next) {
                    permissionActions.push(this.parsePermissionString(perm).action);
                }
            }
            const getAccess = permission => {
                let perm;
                for (const action of permissionActions) {
                    const type = this.formatPermissionType({
                        action: action,
                        collection: queriedCollectionName
                    });
                    if (permission.access[type] === true) {
                        return true;
                    } else if (permission.access[type] === false) {
                        perm = false;
                    }
                }
                return perm;
            };
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
                  permissions = yield PermissionsModel_1.PermissionsModel.findAll(permissionsQuery);
            if (!Array.isArray(permissions) || permissions.length === 0) {
                this.log(`No permissions found, returning false`);
                return false;
            }
            const resourceMap = permissions.reduce((map, perm) => {
                const resourceCollectionName = perm['resourceType'],
                      resourceId = perm['resourceId'];
                if (!map.has(resourceCollectionName)) {
                    map.set(resourceCollectionName, {
                        collection: tyranid_1.default.byName[resourceCollectionName],
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
            for (const _ref2 of resourceMap) {
                var _ref3 = _slicedToArray(_ref2, 2);

                const collectionName = _ref3[0];
                var _ref3$ = _ref3[1];
                const collection = _ref3$.collection;
                const permissions = _ref3$.permissions;

                let queryRestrictionSet = false;
                if (queriedCollectionLinkFields.has(collectionName) || queriedCollectionName === collectionName) {
                    for (const permission of permissions.values()) {
                        const access = getAccess(permission);
                        switch (access) {
                            case true:
                            case false:
                                const key = access ? 'positive' : 'negative';
                                if (!queryMaps[key].has(collectionName)) {
                                    queryMaps[key].set(collectionName, new Set());
                                }
                                queryMaps[key].get(collectionName).add(tyranid_1.default.parseUid(permission.resourceId).id);
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
                        const access = getAccess(permission);
                        switch (access) {
                            case true:
                                positiveIds.push(tyranid_1.default.parseUid(permission.resourceId).id);
                                break;
                            case false:
                                negativeIds.push(tyranid_1.default.parseUid(permission.resourceId).id);
                                break;
                        }
                    }
                    const pathEndCollection = tyranid_1.default.byName[pathEndCollectionName],
                          nextCollection = tyranid_1.default.byName[_.last(path)];
                    positiveIds = yield util_1.stepThroughCollectionPath(positiveIds, pathEndCollection, nextCollection);
                    negativeIds = yield util_1.stepThroughCollectionPath(negativeIds, pathEndCollection, nextCollection);
                    let pathCollectionName, nextCollectionName;
                    while (path.length > 2) {
                        const pathCollection = tyranid_1.default.byName[pathCollectionName = path.pop()],
                              nextCollection = tyranid_1.default.byName[nextCollectionName = _.last(path)];
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
GraclPlugin.isAllowed = PermissionsModel_1.PermissionsModel.isAllowed.bind(PermissionsModel_1.PermissionsModel);
GraclPlugin.setPermissionAccess = PermissionsModel_1.PermissionsModel.setPermissionAccess.bind(PermissionsModel_1.PermissionsModel);
GraclPlugin.deletePermissions = PermissionsModel_1.PermissionsModel.deletePermissions.bind(PermissionsModel_1.PermissionsModel);
GraclPlugin.explainPermission = PermissionsModel_1.PermissionsModel.explainPermission.bind(PermissionsModel_1.PermissionsModel);
GraclPlugin.documentMethods = {
    $setPermissionAccess(permissionType, access) {
        let subjectDocument = arguments.length <= 2 || arguments[2] === undefined ? tyranid_1.default.local.user : arguments[2];

        const doc = this;
        return PermissionsModel_1.PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
    },
    $isAllowed(permissionType) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? tyranid_1.default.local.user : arguments[1];

        const doc = this;
        return PermissionsModel_1.PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
    },
    $isAllowedForThis(permissionAction) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? tyranid_1.default.local.user : arguments[1];

        const doc = this,
              plugin = PermissionsModel_1.PermissionsModel.getGraclPlugin(),
              permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
        });
        return this.$isAllowed(permissionType, subjectDocument);
    },
    $allow(permissionType) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? tyranid_1.default.local.user : arguments[1];

        return this.$setPermissionAccess(permissionType, true, subjectDocument);
    },
    $deny(permissionType) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? tyranid_1.default.local.user : arguments[1];

        return this.$setPermissionAccess(permissionType, false, subjectDocument);
    },
    $allowForThis(permissionAction) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? tyranid_1.default.local.user : arguments[1];

        const doc = this,
              plugin = PermissionsModel_1.PermissionsModel.getGraclPlugin(),
              permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
        });
        return this.$allow(permissionType, subjectDocument);
    },
    $denyForThis(permissionAction) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? tyranid_1.default.local.user : arguments[1];

        const doc = this,
              plugin = PermissionsModel_1.PermissionsModel.getGraclPlugin(),
              permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
        });
        return this.$deny(permissionType, subjectDocument);
    },
    $explainPermission(permissionType) {
        let subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? tyranid_1.default.local.user : arguments[1];

        const doc = this;
        return GraclPlugin.explainPermission(doc, permissionType, subjectDocument);
    }
};
exports.GraclPlugin = GraclPlugin;