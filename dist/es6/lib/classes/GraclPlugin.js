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
const PermissionsModel_1 = require('../models/PermissionsModel');
const gracl = require('gracl');
const _ = require('lodash');
const util_1 = require('../util');
class GraclPlugin {
    constructor(verbose = false) {
        this.verbose = verbose;
    }
    static makeRepository(collection) {
        return {
            getEntity(id, node) {
                return __awaiter(this, void 0, void 0, function* () {
                    return (yield collection.populate('permissionIds', yield collection.byId(id)));
                });
            },
            saveEntity(id, doc, node) {
                return __awaiter(this, void 0, void 0, function* () {
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
            Object.assign(Tyr.documentPrototype, {
                $setPermissionAccess(permissionType, access, subjectDocument = Tyr.local.user) {
                    const doc = this;
                    return PermissionsModel_1.PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
                },
                $isAllowed(permissionType, subjectDocument = Tyr.local.user) {
                    const doc = this;
                    return PermissionsModel_1.PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
                }
            });
            const collections = Tyr.collections, nodeSet = new Set();
            const schemaObjects = {
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
                const linkFields = col.links({ relate: 'ownedBy', direction: 'outgoing' }), collectionName = col.def.name;
                if (!linkFields.length)
                    return;
                if (linkFields.length > 1) {
                    throw new Error(`tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ` +
                        `Collection ${collectionName} has multiple fields with outgoing ownedBy relations.`);
                }
                const [field] = linkFields, { graclType } = field.def;
                if (!graclType)
                    return;
                const allOutgoingFields = col.links({ direction: 'outgoing' });
                const validateField = (f) => {
                    return f.def.link === 'graclPermission' && f.name === 'permissionIds';
                };
                if (!_.find(allOutgoingFields, validateField)) {
                    throw new Error(`Tyranid collection \"${col.def.name}\" has \"graclType\" annotation but no \"permissionIds\" field. ` +
                        `tyranid-gracl requires a field on secured collections of type: \n` +
                        `\"permissionIds: { is: 'array', link: 'graclPermission' }\"`);
                }
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
                subjects: new Map(),
                resources: new Map()
            };
            for (const type of ['subjects', 'resources']) {
                let nodes, tyrObjects;
                if (type === 'subjects') {
                    nodes = schemaMaps.subjects;
                    tyrObjects = schemaObjects.subjects;
                }
                else {
                    nodes = schemaMaps.resources;
                    tyrObjects = schemaObjects.resources;
                }
                for (const node of tyrObjects.links) {
                    const name = node.collection.def.name, parentName = node.link.def.name, parentNamePath = node.collection.parsePath(node.path);
                    nodes.set(name, { name: name,
                        id: node.collection.def.primaryKey.field,
                        parent: parentName,
                        repository: GraclPlugin.makeRepository(node.collection),
                        getParents() {
                            return __awaiter(this, void 0, void 0, function* () {
                                const thisNode = this;
                                let ids = parentNamePath.get(thisNode.doc);
                                if (!(ids instanceof Array)) {
                                    ids = [ids];
                                }
                                const parentObjects = yield node.link.byIds(ids), ParentClass = thisNode.getParentClass();
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
                            id: parent.def.primaryKey.field,
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
        }
    }
    query(queriedCollection, permissionAction, user = Tyr.local.user) {
        return __awaiter(this, void 0, void 0, function* () {
            const permissionType = `${permissionAction}-${queriedCollection.def.name}`;
            this.log(`tyranid-gracl: restricting query for collection = ${queriedCollection.def.name} ` +
                `permissionType = ${permissionType} ` +
                `user = ${user}`);
            if (!permissionType) {
                throw new Error(`No permissionType given to GraclPlugin.query()!`);
            }
            if (!this.graclHierarchy) {
                throw new Error(`Must call GraclPlugin.boot() before using GraclPlugin.query()!`);
            }
            if (!user) {
                this.log(`No user passed to GraclPlugin.query() (or found on Tyr.local) -- no restriction enforced!`);
                return false;
            }
            const ResourceClass = this.graclHierarchy.getResource(queriedCollection.def.name), SubjectClass = this.graclHierarchy.getSubject(user.$model.def.name);
            const subject = new SubjectClass(user);
            const errorMessageHeader = (`Unable to construct query object for ${queriedCollection.name} ` +
                `from the perspective of ${subject.toString()}`);
            const subjectHierarchyIds = yield subject.getHierarchyIds(), resourceHierarchyClasses = ResourceClass.getHierarchyClassNames();
            const permissions = yield PermissionsModel_1.PermissionsModel.find({
                subjectId: { $in: subjectHierarchyIds },
                resourceType: { $in: resourceHierarchyClasses }
            });
            if (!Array.isArray(permissions) || permissions.length === 0) {
                this.log(`No permissions found, returning false!`);
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
                if (queriedCollectionLinkFields.has(collectionName)) {
                    for (const permission of permissions.values()) {
                        const access = permission.access[permissionType];
                        switch (access) {
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
                else {
                    const path = this.getShortestPath(queriedCollection, collection);
                    if (!path.length) {
                        throw new Error(`${errorMessageHeader}, as there is no path between ` +
                            `collections ${queriedCollection.def.name} and ${collectionName} in the schema.`);
                    }
                    const pathEndCollectionName = path.pop();
                    if (collectionName !== pathEndCollectionName) {
                        throw new Error(`Path returned for collection pair ${queriedCollection.def.name} and ${collectionName} is invalid!`);
                    }
                    if (!queriedCollectionLinkFields.has(path[1])) {
                        throw new Error(`Path returned for collection pair ${queriedCollection.def.name} and ${collectionName} ` +
                            `must have the penultimate path exist as a link on the collection being queried, ` +
                            `the penultimate collection path between ${queriedCollection.def.name} and ${collectionName} ` +
                            `is ${path[1]}, which is not linked to by ${queriedCollection.def.name}`);
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
                    const linkedCollectionName = nextCollectionName;
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
            return {
                $and: [
                    util_1.createInQueries(queryMaps['positive'], queriedCollection, '$in'),
                    util_1.createInQueries(queryMaps['negative'], queriedCollection, '$nin')
                ]
            };
        });
    }
}
exports.GraclPlugin = GraclPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixtQ0FBaUMsNEJBQTRCLENBQUMsQ0FBQTtBQUM5RCxNQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUMvQixNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU1Qix1QkFNTyxTQUFTLENBQUMsQ0FBQTtBQUdqQjtJQXdGRSxZQUFtQixPQUFPLEdBQUcsS0FBSztRQUFmLFlBQU8sR0FBUCxPQUFPLENBQVE7SUFBRyxDQUFDO0lBcEZ0QyxPQUFPLGNBQWMsQ0FBQyxVQUFrQztRQUN0RCxNQUFNLENBQUM7WUFDQyxTQUFTLENBQUMsRUFBVSxFQUFFLElBQWdCOztvQkFDMUMsTUFBTSxDQUFnQixDQUNwQixNQUFNLFVBQVUsQ0FBQyxRQUFRLENBQ3ZCLGVBQWUsRUFDZixNQUFNLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQzFCLENBQ0YsQ0FBQztnQkFDSixDQUFDO2FBQUE7WUFDSyxVQUFVLENBQUMsRUFBVSxFQUFFLEdBQWlCLEVBQUUsSUFBZ0I7O29CQUM5RCxNQUFNLENBQUMsbUNBQWdCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pELENBQUM7YUFBQTtTQUNGLENBQUM7SUFDSixDQUFDO0lBUUQsT0FBTyxjQUFjO1FBQ25CLE1BQU0sQ0FBQyxHQUFzQixFQUFFLENBQUM7UUFFaEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEdBQUc7WUFDekIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUM1QyxPQUFPLEdBQUcsR0FBRyxD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