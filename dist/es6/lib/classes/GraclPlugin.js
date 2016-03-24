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
    constructor(opts = { verbose: false, permissionType: [] }) {
        this.unsecuredCollections = new Set([
            PermissionsModel_1.PermissionsModel.def.name,
            PermissionsLocks_1.PermissionLocks.def.name
        ]);
        this.isAllowed = GraclPlugin.isAllowed;
        this.setPermissionAccess = GraclPlugin.setPermissionAccess;
        this.deletePermissions = GraclPlugin.deletePermissions;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixNQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUMvQixNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixtQ0FBaUMsNEJBQTRCLENBQUMsQ0FBQTtBQUM5RCxtQ0FBZ0MsNEJBQTRCLENBQUMsQ0FBQTtBQUM3RCx1QkFNTyxTQUFTLENBQUMsQ0FBQTtBQU9qQjtJQW1ORSxZQUFZLElBQUksR0FBNkQsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUM7UUF6QmpILHlCQUFvQixHQUFHLElBQUksR0FBRyxDQUFDO1lBQzdCLG1DQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJO1lBQ3pCLGtDQUFlLENBQUMsR0FBRyxDQUFDLElBQUk7U0FDekIsQ0FBQyxDQUFDO1FBS0gsY0FBUyxHQUFhLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFDNUMsd0JBQW1CLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDO1FBQ3RELHNCQUFpQixHQUFLLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQztRQUdwRCxZQUFPLEdBQUcsS0FBSyxDQUFDO1FBSWhCLG9CQUFlLEdBQXVCO1lBQ3BDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtZQUNoQixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRTtZQUNoQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7U0FDbkIsQ0FBQztRQUtBLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENB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