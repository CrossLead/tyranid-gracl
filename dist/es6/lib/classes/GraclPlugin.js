"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
    constructor(opts = { verbose: false, permissionType: [] }) {
        this.unsecuredCollections = new Set([
            PermissionsModel_1.PermissionsModel.def.name,
            PermissionsLocks_1.PermissionLocks.def.name
        ]);
        this.isAllowed = GraclPlugin.isAllowed;
        this.setPermissionAccess = GraclPlugin.setPermissionAccess;
        this.deletePermissions = GraclPlugin.deletePermissions;
        this.explainPermission = GraclPlugin.explainPermission;
        this.verbose = false;
        this.permissionTypes = [
            { name: 'edit' },
            { name: 'view', parent: 'edit' },
            { name: 'delete' }
        ];
        if (Array.isArray(opts.permissionType) && opts.permissionType.length) {
            this.permissionTypes = opts.permissionType;
        }
        this.verbose = opts.verbose;
    }
    static makeRepository(collection) {
        return {
            getEntity(id, node) {
                return __awaiter(this, void 0, Promise, function* () {
                    return (yield collection.populate('permissionIds', yield collection.byId(id)));
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
        _.each(tyranid_1.default.collections, col => {
            const links = col.links({ direction: 'outgoing' }), colName = col.def.name;
            _.each(links, linkField => {
                const edges = _.get(g, colName, new Set()), linkName = linkField.link.def.name;
                edges.add(linkName);
                _.set(g, linkName, _.get(g, linkName, new Set()));
                _.set(g, colName, edges);
            });
        });
        const dist = {}, next = {}, keys = _.keys(g);
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
    static constructPermissionHierarchy(permissionsTypes) {
        const sorted = gracl.topologicalSort(permissionsTypes);
        if (_.uniq(sorted, false, 'name').length !== sorted.length) {
            throw new Error(`Duplicate permission types provided: ${permissionsTypes}`);
        }
        const hierarchy = {};
        for (const node of sorted) {
            const name = node['name'];
            hierarchy[name] = {
                name: name,
                parent: hierarchy[node['parent']]
            };
        }
        return hierarchy;
    }
    ;
    getPermissionObject(permissionString) {
        const [action, collection] = permissionString.split('-');
        return this.permissionHierarchy[action];
    }
    nextPermission(permissionString) {
        const [action, collection] = permissionString.split('-'), obj = this.permissionHierarchy[action];
        if (obj && obj['parent']) {
            return `${obj['parent']['name']}-${collection}`;
        }
        return void 0;
    }
    log(message) {
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
        const build = (obj) => (node) => {
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
        let a = colA.def.name, b = colB.def.name, originalEdge = `${a}.${b}`, next = this.outgoingLinkPaths;
        if (!_.get(next, originalEdge))
            return [];
        const path = [a];
        while (a !== b) {
            a = _.get(next, `${a}.${b}`);
            if (!a)
                return [];
            path.push(a);
        }
        return path;
    }
    boot(stage) {
        if (stage === 'post-link') {
            this.log(`starting boot.`);
            this.permissionHierarchy = GraclPlugin.constructPermissionHierarchy(this.permissionTypes);
            Object.assign(tyranid_1.default.documentPrototype, GraclPlugin.documentMethods);
            const collections = tyranid_1.default.collections, nodeSet = new Set();
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
                const linkFields = util_1.getCollectionLinksSorted(col, { relate: 'ownedBy', direction: 'outgoing' }), permissionsLink = util_1.findLinkInCollection(col, PermissionsModel_1.PermissionsModel), collectionName = col.def.name;
                if (!(linkFields.length || permissionsLink))
                    return;
                if (linkFields.length > 1) {
                    throw new Error(`tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ` +
                        `Collection ${collectionName} has multiple fields with outgoing ownedBy relations.`);
                }
                const [field] = linkFields;
                let { graclType } = field ? field.def : permissionsLink.def;
                if (!graclType)
                    return;
                if (!(permissionsLink && permissionsLink.name === 'permissionIds')) {
                    throw new Error(`Tyranid collection \"${col.def.name}\" has \"graclType\" annotation but no \"permissionIds\" field. ` +
                        `tyranid-gracl requires a field on secured collections of type: \n` +
                        `\"permissionIds: { is: 'array', link: 'graclPermission' }\"`);
                }
                if (!Array.isArray(graclType)) {
                    graclType = [graclType];
                }
                if (field && _.contains(graclType, 'resource')) {
                    const linkCollectionPermissionsLink = util_1.findLinkInCollection(field.link, PermissionsModel_1.PermissionsModel);
                    if (!linkCollectionPermissionsLink) {
                        throw new Error(`Collection ${col.def.name} has a resource link to collection ${field.link.def.name} ` +
                            `but ${field.link.def.name} has no permissionIds field!`);
                    }
                }
                let currentType;
                while (currentType = graclType.pop()) {
                    switch (currentType) {
                        case 'subject':
                            if (field) {
                                graclGraphNodes.subjects.links.push(field);
                                graclGraphNodes.subjects.parents.push(field.link);
                            }
                            else {
                                graclGraphNodes.subjects.parents.push(col);
                            }
                            break;
                        case 'resource':
                            if (field) {
                                graclGraphNodes.resources.links.push(field);
                                graclGraphNodes.resources.parents.push(field.link);
                            }
                            else {
                                graclGraphNodes.resources.parents.push(col);
                            }
                            break;
                        default:
                            throw new Error(`Invalid gracl node type set on collection ${collectionName}, type = ${graclType}`);
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
                }
                else {
                    nodes = schemaMaps.resources;
                    tyrObjects = graclGraphNodes.resources;
                }
                for (const node of tyrObjects.links) {
                    const name = node.collection.def.name, parentName = node.link.def.name, parentNamePath = node.collection.parsePath(node.path);
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
                                const linkCollection = node.link, parentObjects = yield linkCollection.find({
                                    [linkCollection.def.primaryKey.field]: { $in: ids }
                                }), ParentClass = thisNode.getParentClass();
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
        console.log('  | \n  | ' +
            JSON
                .stringify(this.getObjectHierarchy(), null, 4)
                .replace(/[{},\":]/g, '')
                .replace(/^\s*\n/gm, '')
                .split('\n')
                .join('\n  | ')
                .replace(/\s+$/, '')
                .replace(/resources/, '---- resources ----')
                .replace(/subjects/, '---- subjects ----') +
            '____');
    }
    query(queriedCollection, permissionAction, subjectDocument = tyranid_1.default.local.user) {
        return __awaiter(this, void 0, Promise, function* () {
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
            if (!subjectDocument) {
                this.log(`No subjectDocument passed to GraclPlugin.query() (or found on Tyr.local) -- no documents allowed`);
                return false;
            }
            if (!this.graclHierarchy.resources.has(queriedCollectionName)) {
                this.log(`Querying against collection (${queriedCollectionName}) with no resource class -- no restriction enforced`);
                return {};
            }
            const permissionActions = [permissionAction];
            let next = permissionType;
            while (next = this.nextPermission(next)) {
                permissionActions.push(next.split('-')[0]);
            }
            const getAccess = (permission) => {
                let perm;
                for (const action of permissionActions) {
                    const type = `${action}-${queriedCollectionName}`;
                    if (permission.access[type] === true) {
                        return true;
                    }
                    else if (permission.access[type] === false) {
                        perm = false;
                    }
                }
                return perm;
            };
            const ResourceClass = this.graclHierarchy.getResource(queriedCollectionName), SubjectClass = this.graclHierarchy.getSubject(subjectDocument.$model.def.name), subject = new SubjectClass(subjectDocument);
            this.log(`restricting query for collection = ${queriedCollectionName} ` +
                `permissionType = ${permissionType} ` +
                `subject = ${subject.toString()}`);
            const errorMessageHeader = (`Unable to construct query object for ${queriedCollection.name} ` +
                `from the perspective of ${subject.toString()}`);
            const subjectHierarchyIds = yield subject.getHierarchyIds(), resourceHierarchyClasses = ResourceClass.getHierarchyClassNames(), permissionsQuery = {
                subjectId: { $in: subjectHierarchyIds },
                resourceType: { $in: resourceHierarchyClasses }
            }, permissions = yield PermissionsModel_1.PermissionsModel.find(permissionsQuery);
            if (!Array.isArray(permissions) || permissions.length === 0) {
                this.log(`No permissions found, returning false`);
                return false;
            }
            const resourceMap = permissions.reduce((map, perm) => {
                const resourceCollectionName = perm['resourceType'], resourceId = perm['resourceId'];
                if (!map.has(resourceCollectionName)) {
                    map.set(resourceCollectionName, {
                        collection: tyranid_1.default.byName[resourceCollectionName],
                        permissions: new Map()
                    });
                }
                map.get(resourceCollectionName).permissions.set(resourceId, perm);
                return map;
            }, new Map());
            const queriedCollectionLinkFields = util_1.getCollectionLinksSorted(queriedCollection)
                .reduce((map, field) => {
                map.set(field.def.link, field);
                return map;
            }, new Map());
            const queryMaps = {
                positive: new Map(),
                negative: new Map()
            };
            for (const [collectionName, { collection, permissions }] of resourceMap) {
                let queryRestrictionSet = false;
                if (queriedCollectionLinkFields.has(collectionName) ||
                    queriedCollectionName === collectionName) {
                    for (const permission of permissions.values()) {
                        const access = getAccess(permission);
                        switch (access) {
                            case true:
                            case false:
                                const key = (access ? 'positive' : 'negative');
                                if (!queryMaps[key].has(collectionName)) {
                                    queryMaps[key].set(collectionName, new Set());
                                }
                                queryMaps[key].get(collectionName).add(tyranid_1.default.parseUid(permission.resourceId).id);
                                break;
                        }
                        queryRestrictionSet = true;
                    }
                }
                else {
                    const path = this.getShortestPath(queriedCollection, collection);
                    if (!path.length) {
                        throw new Error(`${errorMessageHeader}, as there is no path between ` +
                            `collections ${queriedCollectionName} and ${collectionName} in the schema.`);
                    }
                    const pathEndCollectionName = path.pop();
                    if (collectionName !== pathEndCollectionName) {
                        throw new Error(`Path returned for collection pair ${queriedCollectionName} and ${collectionName} is invalid`);
                    }
                    if (!queriedCollectionLinkFields.has(path[1])) {
                        throw new Error(`Path returned for collection pair ${queriedCollectionName} and ${collectionName} ` +
                            `must have the penultimate path exist as a link on the collection being queried, ` +
                            `the penultimate collection path between ${queriedCollectionName} and ${collectionName} ` +
                            `is ${path[1]}, which is not linked to by ${queriedCollectionName}`);
                    }
                    let positiveIds = [], negativeIds = [];
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
                    const pathEndCollection = tyranid_1.default.byName[pathEndCollectionName], nextCollection = tyranid_1.default.byName[_.last(path)];
                    positiveIds = yield util_1.stepThroughCollectionPath(positiveIds, pathEndCollection, nextCollection);
                    negativeIds = yield util_1.stepThroughCollectionPath(negativeIds, pathEndCollection, nextCollection);
                    let pathCollectionName, nextCollectionName;
                    while (path.length > 2) {
                        const pathCollection = tyranid_1.default.byName[pathCollectionName = path.pop()], nextCollection = tyranid_1.default.byName[nextCollectionName = _.last(path)];
                        if (!pathCollection) {
                            throw new Error(`${errorMessageHeader}, invalid collection name given in path! collection: ${pathCollectionName}`);
                        }
                        positiveIds = yield util_1.stepThroughCollectionPath(positiveIds, pathCollection, nextCollection);
                        negativeIds = yield util_1.stepThroughCollectionPath(negativeIds, pathCollection, nextCollection);
                    }
                    const linkedCollectionName = nextCollection.def.name;
                    const addIdsToQueryMap = (access) => (id) => {
                        const accessString = access ? 'positive' : 'negative', altAccessString = access ? 'negative' : 'positive';
                        if (!queryMaps[accessString].has(linkedCollectionName)) {
                            queryMaps[accessString].set(linkedCollectionName, new Set());
                        }
                        if (!queryMaps[altAccessString].has(linkedCollectionName) ||
                            !queryMaps[altAccessString].get(linkedCollectionName).has(id)) {
                            queryMaps[accessString].get(linkedCollectionName).add(id);
                        }
                    };
                    _.each(positiveIds, addIdsToQueryMap(true));
                    _.each(negativeIds, addIdsToQueryMap(false));
                    queryRestrictionSet = true;
                }
                if (!queryRestrictionSet) {
                    throw new Error(`${errorMessageHeader}, unable to set query restriction ` +
                        `to satisfy permissions relating to collection ${collectionName}`);
                }
            }
            const positiveRestriction = util_1.createInQueries(queryMaps['positive'], queriedCollection, '$in'), negativeRestriction = util_1.createInQueries(queryMaps['negative'], queriedCollection, '$nin');
            const restricted = {}, hasPositive = !!positiveRestriction['$or'].length, hasNegative = !!negativeRestriction['$and'].length;
            if (hasNegative && hasPositive) {
                restricted['$and'] = [
                    positiveRestriction,
                    negativeRestriction
                ];
            }
            else if (hasNegative) {
                Object.assign(restricted, negativeRestriction);
            }
            else if (hasPositive) {
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
    $setPermissionAccess(permissionType, access, subjectDocument = tyranid_1.default.local.user) {
        const doc = this;
        return PermissionsModel_1.PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
    },
    $isAllowed(permissionType, subjectDocument = tyranid_1.default.local.user) {
        const doc = this;
        return PermissionsModel_1.PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
    },
    $isAllowedForThis(permissionAction, subjectDocument = tyranid_1.default.local.user) {
        const doc = this;
        const permissionType = `${permissionAction}-${doc.$model.def.name}`;
        return this.$isAllowed(permissionType, subjectDocument);
    },
    $allow(permissionType, subjectDocument = tyranid_1.default.local.user) {
        return this.$setPermissionAccess(permissionType, true, subjectDocument);
    },
    $deny(permissionType, subjectDocument = tyranid_1.default.local.user) {
        return this.$setPermissionAccess(permissionType, false, subjectDocument);
    },
    $allowForThis(permissionAction, subjectDocument = tyranid_1.default.local.user) {
        const doc = this;
        const permissionType = `${permissionAction}-${doc.$model.def.name}`;
        return this.$allow(permissionType, subjectDocument);
    },
    $denyForThis(permissionAction, subjectDocument = tyranid_1.default.local.user) {
        const doc = this;
        const permissionType = `${permissionAction}-${doc.$model.def.name}`;
        return this.$deny(permissionType, subjectDocument);
    }
};
exports.GraclPlugin = GraclPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFDMUIsTUFBWSxLQUFLLFdBQU0sT0FBTyxDQUFDLENBQUE7QUFDL0IsTUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsbUNBQWlDLDRCQUE0QixDQUFDLENBQUE7QUFDOUQsbUNBQWdDLDRCQUE0QixDQUFDLENBQUE7QUFDN0QsdUJBTU8sU0FBUyxDQUFDLENBQUE7QUFPakI7SUF3TkUsWUFBWSxJQUFJLEdBQStELEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFDO1FBMUJuSCx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsQ0FBQztZQUM3QixtQ0FBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSTtZQUN6QixrQ0FBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJO1NBQ3pCLENBQUMsQ0FBQztRQUtILGNBQVMsR0FBYSxXQUFXLENBQUMsU0FBUyxDQUFDO1FBQzVDLHdCQUFtQixHQUFHLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQztRQUN0RCxzQkFBaUIsR0FBSyxXQUFXLENBQUMsaUJBQWlCLENBQUM7UUFDcEQsc0JBQWlCLEdBQUssV0FBVyxDQUFDLGlCQUFpQixDQUFDO1FBR3BELFlBQU8sR0FBRyxLQUFLLENBQUM7UUFJaEIsb0JBQWUsR0FBdUI7WUFDcEMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1lBQ2hCLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFO1lBQ2hDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTtTQUNuQixDQUFDO1FBS0EsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUks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