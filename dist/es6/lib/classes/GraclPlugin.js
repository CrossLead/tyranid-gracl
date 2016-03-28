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
    constructor(opts) {
        this.unsecuredCollections = new Set([
            PermissionsModel_1.PermissionsModel.def.name,
            PermissionsLocks_1.PermissionLocks.def.name
        ]);
        this.isAllowed = GraclPlugin.isAllowed;
        this.setPermissionAccess = GraclPlugin.setPermissionAccess;
        this.deletePermissions = GraclPlugin.deletePermissions;
        this.explainPermission = GraclPlugin.explainPermission;
        this.permissionTypes = [
            { name: 'edit' },
            { name: 'view', parent: 'edit' },
            { name: 'delete' }
        ];
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
    makeRepository(collection) {
        const permissionIds = this.permissionIdProperty;
        return {
            getEntity(id, node) {
                return __awaiter(this, void 0, Promise, function* () {
                    return (yield collection.populate(permissionIds, yield collection.byId(id)));
                });
            },
            saveEntity(id, doc, node) {
                return __awaiter(this, void 0, Promise, function* () {
                    return PermissionsModel_1.PermissionsModel.updatePermissions(doc);
                });
            }
        };
    }
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
                if (!(permissionsLink && permissionsLink.name === this.permissionIdProperty)) {
                    throw new Error(`Tyranid collection \"${col.def.name}\" has \"graclType\" annotation but no ` +
                        `\"${this.permissionIdProperty}\" field. ` +
                        `tyranid-gracl requires a field on secured collections of type: \n` +
                        `\"${this.permissionIdProperty}: { is: 'array', link: 'graclPermission' }\"`);
                }
                if (!Array.isArray(graclType)) {
                    graclType = [graclType];
                }
                if (field && _.contains(graclType, 'resource')) {
                    const linkCollectionPermissionsLink = util_1.findLinkInCollection(field.link, PermissionsModel_1.PermissionsModel);
                    if (!linkCollectionPermissionsLink) {
                        throw new Error(`Collection ${col.def.name} has a resource link to collection ${field.link.def.name} ` +
                            `but ${field.link.def.name} has no ${this.permissionIdProperty} field!`);
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
                        permissionProperty: this.permissionProperty,
                        repository: this.makeRepository(node.collection),
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
    },
    $explainPermission(permissionType, subjectDocument = tyranid_1.default.local.user) {
        const doc = this;
        return GraclPlugin.explainPermission(doc, permissionType, subjectDocument);
    }
};
exports.GraclPlugin = GraclPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFDMUIsTUFBWSxLQUFLLFdBQU0sT0FBTyxDQUFDLENBQUE7QUFDL0IsTUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsbUNBQWlDLDRCQUE0QixDQUFDLENBQUE7QUFDOUQsbUNBQWdDLDRCQUE0QixDQUFDLENBQUE7QUFDN0QsdUJBTU8sU0FBUyxDQUFDLENBQUE7QUFZakI7SUE4TUUsWUFBWSxJQUFvQjtRQTdCaEMseUJBQW9CLEdBQUcsSUFBSSxHQUFHLENBQUM7WUFDN0IsbUNBQWdCLENBQUMsR0FBRyxDQUFDLElBQUk7WUFDekIsa0NBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUM7UUFLSCxjQUFTLEdBQWEsV0FBVyxDQUFDLFNBQVMsQ0FBQztRQUM1Qyx3QkFBbUIsR0FBRyxXQUFXLENBQUMsbUJBQW1CLENBQUM7UUFDdEQsc0JBQWlCLEdBQUssV0FBVyxDQUFDLGlCQUFpQixDQUFDO1FBQ3BELHNCQUFpQixHQUFLLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQztRQVVwRCxvQkFBZSxHQUF1QjtZQUNwQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7WUFDaEIsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDaEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO1NBQ25CLENBQUM7UUFLQSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUVsQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZ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