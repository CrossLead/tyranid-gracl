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
        const sorted = gracl.topologicalSort(_.map(permissionsTypes, perm => {
            if (/-/.test(perm['parent'])) {
                perm['collection_parent'] = perm['parent'];
                perm['parent'] = perm['parent'].split('-')[0];
            }
            return perm;
        }));
        if (_.uniq(sorted, false, 'name').length !== sorted.length) {
            throw new Error(`Duplicate permission types provided: ${permissionsTypes}`);
        }
        const hierarchy = {};
        for (const node of sorted) {
            const name = node['name'];
            hierarchy[name] = {
                name: name,
                parent: hierarchy[node['collection_parent'] || node['parent']]
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
            return `${obj['parent']['name']}${collection ? '-' + collection : ''}`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFDMUIsTUFBWSxLQUFLLFdBQU0sT0FBTyxDQUFDLENBQUE7QUFDL0IsTUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsbUNBQWlDLDRCQUE0QixDQUFDLENBQUE7QUFDOUQsbUNBQWdDLDRCQUE0QixDQUFDLENBQUE7QUFDN0QsdUJBTU8sU0FBUyxDQUFDLENBQUE7QUFZakI7SUFvTkUsWUFBWSxJQUFvQjtRQTdCaEMseUJBQW9CLEdBQUcsSUFBSSxHQUFHLENBQUM7WUFDN0IsbUNBQWdCLENBQUMsR0FBRyxDQUFDLElBQUk7WUFDekIsa0NBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUM7UUFLSCxjQUFTLEdBQWEsV0FBVyxDQUFDLFNBQVMsQ0FBQztRQUM1Qyx3QkFBbUIsR0FBRyxXQUFXLENBQUMsbUJBQW1CLENBQUM7UUFDdEQsc0JBQWlCLEdBQUssV0FBVyxDQUFDLGlCQUFpQixDQUFDO1FBQ3BELHNCQUFpQixHQUFLLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQztRQVVwRCxvQkFBZSxHQUF1QjtZQUNwQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7WUFDaEIsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDaEMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO1NBQ25CLENBQUM7UUFLQSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUVsQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZ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