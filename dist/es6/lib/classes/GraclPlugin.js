"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
    constructor(verbose = false) {
        this.verbose = verbose;
        this.unsecuredCollections = new Set([
            PermissionsModel_1.PermissionsModel.def.name,
            PermissionsLocks_1.PermissionLocks.def.name
        ]);
        this.isAllowed = GraclPlugin.isAllowed;
        this.setPermissionAccess = GraclPlugin.setPermissionAccess;
        this.deletePermissions = GraclPlugin.deletePermissions;
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
        _.each(Tyr.collections, col => {
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
    ;
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
            Object.assign(Tyr.documentPrototype, GraclPlugin.documentMethods);
            const collections = Tyr.collections, nodeSet = new Set();
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
                                }, null, { tyranid: { insecure: true } }), ParentClass = thisNode.getParentClass();
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
    query(queriedCollection, permissionAction, subjectDocument = Tyr.local.user) {
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
            const ResourceClass = this.graclHierarchy.getResource(queriedCollectionName), SubjectClass = this.graclHierarchy.getSubject(subjectDocument.$model.def.name), subject = new SubjectClass(subjectDocument);
            this.log(`restricting query for collection = ${queriedCollectionName} ` +
                `permissionType = ${permissionType} ` +
                `subject = ${subject.toString()}`);
            const errorMessageHeader = (`Unable to construct query object for ${queriedCollection.name} ` +
                `from the perspective of ${subject.toString()}`);
            const subjectHierarchyIds = yield subject.getHierarchyIds(), resourceHierarchyClasses = ResourceClass.getHierarchyClassNames(), permissionsQuery = {
                subjectId: { $in: subjectHierarchyIds },
                resourceType: { $in: resourceHierarchyClasses }
            }, permissions = yield PermissionsModel_1.PermissionsModel.find(permissionsQuery, null, { tyranid: { insecure: true } });
            if (!Array.isArray(permissions) || permissions.length === 0) {
                this.log(`No permissions found, returning false`);
                return false;
            }
            const resourceMap = permissions.reduce((map, perm) => {
                const resourceCollectionName = perm['resourceType'], resourceId = perm['resourceId'];
                if (!map.has(resourceCollectionName)) {
                    map.set(resourceCollectionName, {
                        collection: Tyr.byName[resourceCollectionName],
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
                        const access = permission.access[permissionType];
                        switch (access) {
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
                    const pathEndCollection = Tyr.byName[pathEndCollectionName], nextCollection = Tyr.byName[_.last(path)];
                    positiveIds = yield util_1.stepThroughCollectionPath(positiveIds, pathEndCollection, nextCollection);
                    negativeIds = yield util_1.stepThroughCollectionPath(negativeIds, pathEndCollection, nextCollection);
                    let pathCollectionName, nextCollectionName;
                    while (path.length > 2) {
                        const pathCollection = Tyr.byName[pathCollectionName = path.pop()], nextCollection = Tyr.byName[nextCollectionName = _.last(path)];
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
GraclPlugin.documentMethods = {
    $setPermissionAccess(permissionType, access, subjectDocument = Tyr.local.user) {
        const doc = this;
        return PermissionsModel_1.PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
    },
    $isAllowed(permissionType, subjectDocument = Tyr.local.user) {
        const doc = this;
        return PermissionsModel_1.PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
    },
    $isAllowedForThis(permissionAction, subjectDocument = Tyr.local.user) {
        const doc = this;
        const permissionType = `${permissionAction}-${doc.$model.def.name}`;
        return this.$isAllowed(permissionType, subjectDocument);
    },
    $allow(permissionType, subjectDocument = Tyr.local.user) {
        return this.$setPermissionAccess(permissionType, true, subjectDocument);
    },
    $deny(permissionType, subjectDocument = Tyr.local.user) {
        return this.$setPermissionAccess(permissionType, false, subjectDocument);
    },
    $allowForThis(permissionAction, subjectDocument = Tyr.local.user) {
        const doc = this;
        const permissionType = `${permissionAction}-${doc.$model.def.name}`;
        return this.$allow(permissionType, subjectDocument);
    },
    $denyForThis(permissionAction, subjectDocument = Tyr.local.user) {
        const doc = this;
        const permissionType = `${permissionAction}-${doc.$model.def.name}`;
        return this.$deny(permissionType, subjectDocument);
    }
};
exports.GraclPlugin = GraclPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixNQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUMvQixNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixtQ0FBaUMsNEJBQTRCLENBQUMsQ0FBQTtBQUM5RCxtQ0FBZ0MsNEJBQTRCLENBQUMsQ0FBQTtBQUM3RCx1QkFNTyxTQUFTLENBQUMsQ0FBQTtBQUlqQjtJQWtLRSxZQUFtQixPQUFPLEdBQUcsS0FBSztRQUFmLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFYbEMseUJBQW9CLEdBQUcsSUFBSSxHQUFHLENBQUM7WUFDN0IsbUNBQWdCLENBQUMsR0FBRyxDQUFDLElBQUk7WUFDekIsa0NBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUM7UUFHSCxjQUFTLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQztRQUNsQyx3QkFBbUIsR0FBRyxXQUFXLENBQUMsbUJBQW1CLENBQUM7UUFDdEQsc0JBQWlCLEdBQUcsV0FBVyxDQUFDLGlCQUFpQixDQUFDO0lBS2xELENBQUM7SUFwR0QsT0FBTyxjQUFjLENBQUMsVUFBa0M7UUFDdEQsTUFBTSxDQUFDO1lBQ0MsU0FBUyxDQUFDLEVBQVUsRUFBRSxJQUFnQjs7b0JBQzFDLE1BQU0sQ0FBZ0IsQ0FDcEIsTUFBTSxVQUFVLENBQUMsUUFBUSxDQUN2QixlQUFlLEVBQ2YsTUFBTSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUMxQixDQUNGLENBQUM7Z0JBQ0osQ0FBQzthQUFBO1lBQ0ssVUFBVSxDQUFDLEVBQVUsRUFBRSxHQUFpQixFQUFFLElBQWdCOztvQkFDOUQsTUFBTSxDQUFDLG1DQUFnQixD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