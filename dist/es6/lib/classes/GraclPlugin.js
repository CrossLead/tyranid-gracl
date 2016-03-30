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
            { name: 'view', parents: ['edit'] },
            { name: 'delete' }
        ];
        opts = opts || {};
        if (Array.isArray(opts.permissionTypes) && opts.permissionTypes.length) {
            this.permissionTypes = opts.permissionTypes;
        }
        if (opts.permissionIdProperty && !/Ids$/.test(opts.permissionIdProperty)) {
            throw new Error(`permissionIdProperty should end with "Ids", given: ${opts.permissionIdProperty}`);
        }
        this.verbose = opts.verbose || false;
        this.permissionIdProperty = opts.permissionIdProperty || 'graclResourcePermissionIds';
        this.populatedPermissionsProperty = this.permissionIdProperty + '$';
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
    ;
    parsePermissionString(perm) {
        if (!perm)
            throw new Error(`Tried to split empty permission!`);
        const [action, collection] = perm.split('-');
        return {
            action: action,
            collection: collection
        };
    }
    formatPermissionType(components) {
        const hierarchyNode = this.permissionHierarchy[components.action];
        if (!hierarchyNode.abstract && components.collection) {
            return `${components.action}-${components.collection}`;
        }
        return components.action;
    }
    constructPermissionHierarchy(permissionsTypes) {
        if (!this.graclHierarchy) {
            throw new Error(`Must build subject/resource hierarchy before creating permission hierarchy`);
        }
        const sorted = gracl.topologicalSort(_.map(permissionsTypes, perm => {
            if (perm['abstract'] === undefined) {
                throw new Error(`Must set { abstract: true | false } property for all permission types! ` +
                    `permission ${JSON.stringify(perm)} does not have \"abstract\" property`);
            }
            const singleParent = perm['parent'];
            if (singleParent)
                perm['parents'] = [singleParent];
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
                            throw new Error(`Collection ${parsed.collection} in permission ` +
                                `"${parent}" does not exist in the resource hierarchy!`);
                        }
                        colParents.push(parsed.action);
                    }
                    else {
                        colParents.push(parent);
                    }
                }
                perm['collection_parents'] = _.unique(colParents);
            }
            return perm;
        }), 'name', 'collection_parents');
        const duplicates = new Set(), exist = new Set();
        for (const perm of sorted) {
            if (exist.has(perm['name'])) {
                duplicates.add(perm['name']);
            }
            exist.add(perm['name']);
        }
        if (duplicates.size) {
            throw new Error(`Duplicate permission types provided: ${[...duplicates].join(', ')}`);
        }
        const hierarchy = {};
        for (const node of sorted) {
            const name = node['name'], parents = node['parents'], abstract = node['abstract'];
            hierarchy[name] = {
                name: name,
                abstract: abstract,
                parents: _.map(parents, (p) => {
                    const hierarchyParent = hierarchy[p];
                    if (abstract && hierarchyParent && !hierarchyParent.abstract) {
                        throw new Error(`If a permission is abstract, it either needs an abstract parent ` +
                            `or a parent that references a specific collection.`);
                    }
                    if (hierarchyParent)
                        return hierarchyParent;
                    const parsed = this.parsePermissionString(p);
                    if (abstract && !parsed.collection) {
                        throw new Error(`Parent permissions of abstract permission must ` +
                            `themseleves be abstract or reference a specific collection. ` +
                            `Abstract permission ${name} has parent permission ${p} which is not specific to a collection`);
                    }
                    if (!this.graclHierarchy.resources.has(parsed.collection)) {
                        throw new Error(`Collection ${parsed.collection} in permission ` +
                            `"${p}" does not exist in the resource hierarchy!`);
                    }
                    return {
                        name: p,
                        parents: [
                            hierarchy[parsed.action]
                        ]
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
        const components = this.parsePermissionString(permissionString), obj = this.permissionHierarchy[components.action];
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
            const permissionIdProperty = this.permissionIdProperty;
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
                        permissionProperty: this.populatedPermissionsProperty,
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
                                if (!parentObjects.length)
                                    return [];
                                const populated = (yield linkCollection.populate(permissionIdProperty, parentObjects));
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
                this.log(`Querying against collection (${queriedCollectionName}) with no resource class -- no restriction enforced`);
                return {};
            }
            const permissionActions = [permissionAction], getNext = (n) => {
                return _.chain(n).map(p => this.nextPermissions(p)).flatten().value();
            };
            let next = [permissionType];
            while ((next = getNext(next)).length) {
                for (const perm of next) {
                    permissionActions.push(this.parsePermissionString(perm).action);
                }
            }
            const getAccess = (permission) => {
                let perm;
                for (const action of permissionActions) {
                    const type = this.formatPermissionType({
                        action: action,
                        collection: queriedCollectionName
                    });
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
        const doc = this, plugin = PermissionsModel_1.PermissionsModel.getGraclPlugin(), permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
        });
        return this.$isAllowed(permissionType, subjectDocument);
    },
    $allow(permissionType, subjectDocument = tyranid_1.default.local.user) {
        return this.$setPermissionAccess(permissionType, true, subjectDocument);
    },
    $deny(permissionType, subjectDocument = tyranid_1.default.local.user) {
        return this.$setPermissionAccess(permissionType, false, subjectDocument);
    },
    $allowForThis(permissionAction, subjectDocument = tyranid_1.default.local.user) {
        const doc = this, plugin = PermissionsModel_1.PermissionsModel.getGraclPlugin(), permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
        });
        return this.$allow(permissionType, subjectDocument);
    },
    $denyForThis(permissionAction, subjectDocument = tyranid_1.default.local.user) {
        const doc = this, plugin = PermissionsModel_1.PermissionsModel.getGraclPlugin(), permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
        });
        return this.$deny(permissionType, subjectDocument);
    },
    $explainPermission(permissionType, subjectDocument = tyranid_1.default.local.user) {
        const doc = this;
        return GraclPlugin.explainPermission(doc, permissionType, subjectDocument);
    }
};
exports.GraclPlugin = GraclPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFDMUIsTUFBWSxLQUFLLFdBQU0sT0FBTyxDQUFDLENBQUE7QUFDL0IsTUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsbUNBQWlDLDRCQUE0QixDQUFDLENBQUE7QUFDOUQsbUNBQWdDLDRCQUE0QixDQUFDLENBQUE7QUFDN0QsdUJBTU8sU0FBUyxDQUFDLENBQUE7QUFrQmpCO0lBa01FLFlBQVksSUFBb0I7UUE3QmhDLHlCQUFvQixHQUFHLElBQUksR0FBRyxDQUFDO1lBQzdCLG1DQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJO1lBQ3pCLGtDQUFlLENBQUMsR0FBRyxDQUFDLElBQUk7U0FDekIsQ0FBQyxDQUFDO1FBS0gsY0FBUyxHQUFhLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFDNUMsd0JBQW1CLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDO1FBQ3RELHNCQUFpQixHQUFLLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQztRQUNwRCxzQkFBaUIsR0FBSyxXQUFXLENBQUMsaUJBQWlCLENBQUM7UUFVcEQsb0JBQWUsR0FBdUI7WUFDcEMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1lBQ2hCLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBRSxNQUFNLENBQUUsRUFBRTtZQUNyQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7U0FDbkIsQ0FBQztRQUtBLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBRWxCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDOUMsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLE1BQU0sSUFBSSxLQUFLLENBQUMsc0RBQXNELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDckcsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUM7UUFDckMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsSUFBSSw0QkFBNEIsQ0FBQztRQUN0RixJQUFJLENBQUMsNEJBQTRCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztJQUN0RSxDQUFDO0lBM0dELE9BQU8sY0FBYztRQUNuQixNQUFNLENBQUMsR0FBc0IsRUFBRSxDQUFDO1FBRWhDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRztZQUN6QixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQzVDLE9BQU8sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztZQUU3QixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxTQUFTO2dCQUNyQixNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQVUsQ0FBQyxFQUM1QyxRQUFRLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUV6QyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUVwQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNsRCxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sSUFBSSxHQUF1QixFQUFFLEVBQzdCLElBQUksR0FBdUIsRUFBRSxFQUM3QixJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUd2QixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1osQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNyQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNaLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBRUgsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNaLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1osRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUM1QixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDOUIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFHSCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1osQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNaLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDekMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3JDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzFCLENBQUM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7O0lBd0RELHFCQUFxQixDQUFDLElBQVk7UUFDaEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFBQyxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7UUFFL0QsTUFBTSxDQUFFLE1BQU0sRUFBRSxVQUFVLENBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQztZQUNMLFFBQUEsTUFBTTtZQUNOLFlBQUEsVUFBVTtTQUNYLENBQUM7SUFDSixDQUFDO0lBSUQsb0JBQW9CLENBQUMsVUFBbUQ7UUFDdEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUlsRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDckQsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDekQsQ0FBQztRQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO0lBQzNCLENBQUM7SUFPRCw0QkFBNEIsQ0FBQyxnQkFBb0M7UUFFL0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLDRFQUE0RSxDQUFDLENBQUM7UUFDaEcsQ0FBQztRQU1ELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJO1lBRS9ELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLElBQUksS0FBSyxDQUNiLHlFQUF5RTtvQkFDekUsY0FBYyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsQ0FDekUsQ0FBQztZQUNKLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDO2dCQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFFLFlBQVksQ0FBRSxDQUFDO1lBT3JELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNoQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNaLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQztnQkFDM0UsQ0FBQztnQkFFRCxNQUFNLFVBQVUsR0FBYyxFQUFFLENBQUM7Z0JBQ2pDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBRTdCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNyQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQ2IsMEZBQTBGLENBQzNGLENBQUM7d0JBQ0osQ0FBQzt3QkFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBRWxELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzFELE1BQU0sSUFBSSxLQUFLLENBQ2IsY0FBYyxNQUFNLENBQUMsVUFBVSxpQkFBaUI7Z0NBQ2hELElBQUksTUFBTSw2Q0FBNkMsQ0FDeEQsQ0FBQzt3QkFDSixDQUFDO3dCQUlELFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNqQyxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNOLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzFCLENBQUM7Z0JBQ0gsQ0FBQztnQkFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3BELENBQUM7WUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQUUsRUFDdEIsS0FBSyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFFeEIsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMxQixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMvQixDQUFDO1lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEYsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUF3QixFQUFFLENBQUM7UUFFMUMsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQ25CLE9BQU8sR0FBYyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQ3BDLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFbEMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHO2dCQUNoQixNQUFBLElBQUk7Z0JBQ0osUUFBUSxFQUFFLFFBQVE7Z0JBRWxCLE9BQU8sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQVM7b0JBQ2hDLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFckMsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLGVBQWUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUM3RCxNQUFNLElBQUksS0FBSyxDQUNiLGtFQUFrRTs0QkFDbEUsb0RBQW9ELENBQ3JELENBQUM7b0JBQ0osQ0FBQztvQkFFRCxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUM7d0JBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztvQkFFNUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUU3QyxFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzt3QkFDbkMsTUFBTSxJQUFJLEtBQUssQ0FDYixpREFBaUQ7NEJBQ2pELDhEQUE4RDs0QkFDOUQsdUJBQXVCLElBQUksMEJBQTBCLENBQUMsd0NBQXdDLENBQy9GLENBQUM7b0JBQ0osQ0FBQztvQkFFRCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUMxRCxNQUFNLElBQUksS0FBSyxDQUNiLGNBQWMsTUFBTSxDQUFDLFVBQVUsaUJBQWlCOzRCQUNoRCxJQUFJLENBQUMsNkNBQTZDLENBQ25ELENBQUM7b0JBQ0osQ0FBQztvQkFFRCxNQUFNLENBQUM7d0JBQ0wsSUFBSSxFQUFFLENBQUM7d0JBQ1AsT0FBTyxFQUFFOzRCQUVQLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO3lCQUN6QjtxQkFDRixDQUFDO2dCQUNKLENBQUMsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBR0QsY0FBYyxDQUFDLFVBQWtDO1FBQy9DLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDO1FBQ3ZELE1BQU0sQ0FBQztZQUVDLFNBQVMsQ0FBQyxFQUFVLEVBQUUsSUFBZ0I7O29CQUMxQyxJQUFJLEdBQUcsR0FBRyxNQUFNLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3BDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDOUQsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO29CQUNsRCxDQUFDO29CQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ2IsQ0FBQzthQUFBO1lBRUssVUFBVSxDQUFDLEVBQVUsRUFBRSxHQUFpQixFQUFFLElBQWdCOztvQkFDOUQsR0FBRyxHQUFHLE1BQU0sbUNBQWdCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3BELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDOUQsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO29CQUNsRCxDQUFDO29CQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ2IsQ0FBQzthQUFBO1NBRUYsQ0FBQztJQUNKLENBQUM7SUFHRCxtQkFBbUIsQ0FBQyxnQkFBd0I7UUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN2RixDQUFDO0lBR0QsZUFBZSxDQUFDLGdCQUF3QjtRQUN0QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsRUFDekQsR0FBRyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFeEQsSUFBSSxXQUFXLEdBQWEsRUFBRSxDQUFDO1FBRS9CLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTFCLFdBQVcsR0FBcUIsR0FBRyxDQUFDLFNBQVMsQ0FBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUduRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFFbkUsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztvQkFDL0IsTUFBTSxFQUFFLG9CQUFvQixDQUFDLE1BQU07b0JBR25DLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQyxVQUFVLElBQUksVUFBVSxDQUFDLFVBQVU7aUJBQ3JFLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUM7SUFDckIsQ0FBQztJQUlELEdBQUcsQ0FBQyxPQUFlO1FBQ2pCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBSUQsa0JBQWtCO1FBQ2hCLE1BQU0sU0FBUyxHQUFHO1lBQ2hCLFFBQVEsRUFBRSxFQUFFO1lBQ1osU0FBUyxFQUFFLEVBQUU7U0FDZCxDQUFDO1FBRUYsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFRLEtBQUssQ0FBQyxJQUF1QjtZQUNsRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyRCxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDWixHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUIsQ0FBQztRQUNILENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFRRCxlQUFlLENBQUMsSUFBNEIsRUFBRSxJQUE0QjtRQUN4RSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFDakIsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUNqQixZQUFZLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQzFCLElBQUksR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7UUFFbEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFFMUMsTUFBTSxJQUFJLEdBQWEsQ0FBRSxDQUFDLENBQUUsQ0FBQztRQUU3QixPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNmLENBQUMsR0FBWSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3RDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNmLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQVFELElBQUksQ0FBQyxLQUFvQjtRQUN2QixFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMxQixJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFFM0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBRyxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQU9sRSxNQUFNLFdBQVcsR0FBRyxpQkFBRyxDQUFDLFdBQVcsRUFDN0IsT0FBTyxHQUFPLElBQUksR0FBRyxFQUFVLENBQUM7WUFFdEMsTUFBTSxlQUFlLEdBQUc7Z0JBQ3RCLFFBQVEsRUFBMEI7b0JBQ2hDLEtBQUssRUFBRSxFQUFFO29CQUNULE9BQU8sRUFBRSxFQUFFO2lCQUNaO2dCQUNELFNBQVMsRUFBMEI7b0JBQ2pDLEtBQUssRUFBRSxFQUFFO29CQUNULE9BQU8sRUFBRSxFQUFFO2lCQUNaO2FBQ0YsQ0FBQztZQUVGLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDO1lBSXZELFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRztnQkFDckIsTUFBTSxVQUFVLEdBQUcsK0JBQXdCLENBQUMsR0FBRyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFDeEYsZUFBZSxHQUFHLDJCQUFvQixDQUFDLEdBQUcsRUFBRSxtQ0FBZ0IsQ0FBQyxFQUM3RCxjQUFjLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0JBR3BDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLGVBQWUsQ0FBQyxDQUFDO29CQUFDLE1BQU0sQ0FBQztnQkFHcEQsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMxQixNQUFNLElBQUksS0FBSyxDQUNiLCtFQUErRTt3QkFDL0UsY0FBYyxjQUFjLHVEQUF1RCxDQUNwRixDQUFDO2dCQUNKLENBQUM7Z0JBRUQsTUFBTSxDQUFFLEtBQUssQ0FBRSxHQUFHLFVBQVUsQ0FBQztnQkFDN0IsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUM7Z0JBRzVELEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO29CQUFDLE1BQU0sQ0FBQztnQkFFdkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDN0UsTUFBTSxJQUFJLEtBQUssQ0FDYix3QkFBd0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHlDQUF5Qzt3QkFDN0UsS0FBSyxJQUFJLENBQUMsb0JBQW9CLFlBQVk7d0JBQzFDLG1FQUFtRTt3QkFDbkUsS0FBSyxJQUFJLENBQUMsb0JBQW9CLDhDQUE4QyxDQUM3RSxDQUFDO2dCQUNKLENBQUM7Z0JBR0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDOUIsU0FBUyxHQUFHLENBQUUsU0FBUyxDQUFFLENBQUM7Z0JBQzVCLENBQUM7Z0JBSUQsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0MsTUFBTSw2QkFBNkIsR0FBRywyQkFBb0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLG1DQUFnQixDQUFDLENBQUM7b0JBQ3pGLEVBQUUsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDO3dCQUNuQyxNQUFNLElBQUksS0FBSyxDQUNiLGNBQWMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHNDQUFzQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUc7NEJBQ3RGLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLElBQUksQ0FBQyxvQkFBb0IsU0FBUyxDQUN4RSxDQUFDO29CQUNKLENBQUM7Z0JBQ0gsQ0FBQztnQkFFRCxJQUFJLFdBQW1CLENBQUM7Z0JBQ3hCLE9BQU8sV0FBVyxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO29CQUNyQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO3dCQUNwQixLQUFLLFNBQVM7NEJBQ1osRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQ0FDVixlQUFlLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0NBQzNDLGVBQWUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ3BELENBQUM7NEJBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ04sZUFBZSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QyxDQUFDOzRCQUNELEtBQUssQ0FBQzt3QkFDUixLQUFLLFVBQVU7NEJBQ2IsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQ0FDVixlQUFlLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0NBQzVDLGVBQWUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ3JELENBQUM7NEJBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ04sZUFBZSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUM5QyxDQUFDOzRCQUNELEtBQUssQ0FBQzt3QkFDUjs0QkFDRSxNQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxjQUFjLFlBQVksU0FBUyxFQUFFLENBQUMsQ0FBQztvQkFDeEcsQ0FBQztnQkFDSCxDQUFDO1lBRUgsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLFVBQVUsR0FBRztnQkFDakIsUUFBUSxFQUFFLElBQUksR0FBRyxFQUE0QjtnQkFDN0MsU0FBUyxFQUFFLElBQUksR0FBRyxFQUE0QjthQUMvQyxDQUFDO1lBRUYsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLEtBQW9DLEVBQ3BDLFVBQWlDLENBQUM7Z0JBRXRDLEVBQUUsQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUN4QixLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQztvQkFDNUIsVUFBVSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3hDLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUM7b0JBQzdCLFVBQVUsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDO2dCQUN6QyxDQUFDO2dCQUVELEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUNwQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQy9CLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQy9CLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBSzVELEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO3dCQUNkLE1BQUEsSUFBSTt3QkFDSixFQUFFLEVBQUUsTUFBTTt3QkFDVixNQUFNLEVBQUUsVUFBVTt3QkFDbEIsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLDRCQUE0Qjt3QkFDckQsVUFBVSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQzt3QkFDMUMsVUFBVTs7Z0NBQ2QsTUFBTSxRQUFRLEdBQWdCLElBQUksQ0FBQztnQ0FFbkMsSUFBSSxHQUFHLEdBQVEsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBRWhELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUM1QixHQUFHLEdBQUcsQ0FBRSxHQUFHLENBQUUsQ0FBQztnQ0FDaEIsQ0FBQztnQ0FFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUMxQixhQUFhLEdBQUksTUFBTSxjQUFjLENBQUMsSUFBSSxDQUFDO29DQUN2QixDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtpQ0FDckQsQ0FBQyxFQUNuQixXQUFXLEdBQU0sUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dDQUVqRCxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7b0NBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQ0FFckMsTUFBTSxTQUFTLEdBQW9CLENBQUMsTUFBTSxjQUFjLENBQUMsUUFBUSxDQUMvRCxvQkFBb0IsRUFBRSxhQUFhLENBQ3BDLENBQUMsQ0FBQztnQ0FFSCxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDcEQsQ0FBQzt5QkFBQTtxQkFDRixDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxHQUFHLENBQUMsQ0FBQyxNQUFNLE1BQU0sSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDeEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7b0JBQzdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFOzRCQUNkLE1BQUEsSUFBSTs0QkFDSixFQUFFLEVBQUUsTUFBTTs0QkFDVixrQkFBa0IsRUFBRSxJQUFJLENBQUMsNEJBQTRCOzRCQUNyRCxVQUFVLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7eUJBQ3hDLENBQUMsQ0FBQztvQkFDTCxDQUFDO2dCQUNILENBQUM7WUFFSCxDQUFDO1lBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ2pDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFdEQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUM7Z0JBQ3BDLFFBQVEsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2xELFNBQVMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDckQsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN0QixDQUFDO1lBRUQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDckYsQ0FBQztJQUNILENBQUM7SUFPRCxZQUFZO1FBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDO1FBQzlFLE9BQU8sQ0FBQyxHQUFHLENBQ1QsWUFBWTtZQUNaLElBQUk7aUJBQ0QsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7aUJBQzdDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO2lCQUN4QixPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztpQkFDdkIsS0FBSyxDQUFDLElBQUksQ0FBQztpQkFDWCxJQUFJLENBQUMsUUFBUSxDQUFDO2lCQUNkLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO2lCQUNuQixPQUFPLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDO2lCQUMzQyxPQUFPLENBQUMsVUFBVSxFQUFFLG9CQUFvQixDQUFDO1lBQzVDLE1BQU0sQ0FDUCxDQUFDO0lBQ0osQ0FBQztJQU9LLEtBQUssQ0FBQyxpQkFBeUMsRUFDekMsZ0JBQXdCLEVBQ3hCLGVBQWUsR0FBRyxpQkFBRyxDQUFDLEtBQUssQ0FBQyxJQUFJOztZQUUxQyxNQUFNLHFCQUFxQixHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFFekQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMscUJBQXFCLGdDQUFnQyxDQUFDLENBQUM7Z0JBQ25HLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDWixDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDO2dCQUMvQyxNQUFNLEVBQUUsZ0JBQWdCO2dCQUN4QixVQUFVLEVBQUUscUJBQXFCO2FBQ2xDLENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7WUFDdEUsQ0FBQztZQUVELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsK0RBQStELENBQUMsQ0FBQztZQUNuRixDQUFDO1lBR0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO2dCQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLGtHQUFrRyxDQUFDLENBQUM7Z0JBQzdHLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDZixDQUFDO1lBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlELElBQUksQ0FBQyxHQUFHLENBQ04sZ0NBQWdDLHFCQUFxQixxREFBcUQsQ0FDM0csQ0FBQztnQkFDRixNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ1osQ0FBQztZQUdELE1BQU0saUJBQWlCLEdBQUcsQ0FBRSxnQkFBZ0IsQ0FBRSxFQUN4QyxPQUFPLEdBQUcsQ0FBQyxDQUFXO2dCQUNwQixNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4RSxDQUFDLENBQUM7WUFFUixJQUFJLElBQUksR0FBRyxDQUFFLGNBQWMsQ0FBRSxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxJQUFJLEdBQWMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hELEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ3hCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xFLENBQUM7WUFDSCxDQUFDO1lBS0QsTUFBTSxTQUFTLEdBQUcsQ0FBQyxVQUE0QjtnQkFDN0MsSUFBSSxJQUFhLENBQUM7Z0JBQ2xCLEdBQUcsQ0FBQyxDQUFDLE1BQU0sTUFBTSxJQUFJLGlCQUFpQixDQUFDLENBQUMsQ0FBQztvQkFFdkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDO3dCQUNyQyxNQUFNLEVBQUUsTUFBTTt3QkFDZCxVQUFVLEVBQUUscUJBQXFCO3FCQUNsQyxDQUFDLENBQUM7b0JBRUgsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUVyQyxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNkLENBQUM7b0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFFN0MsSUFBSSxHQUFHLEtBQUssQ0FBQztvQkFDZixDQUFDO2dCQUNILENBQUM7Z0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNkLENBQUMsQ0FBQztZQUlGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEVBQ3RFLFlBQVksR0FBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFDL0UsT0FBTyxHQUFTLElBQUksWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRXhELElBQUksQ0FBQyxHQUFHLENBQ04sc0NBQXNDLHFCQUFxQixHQUFHO2dCQUM5RCxvQkFBb0IsY0FBYyxHQUFHO2dCQUNyQyxhQUFhLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUNsQyxDQUFDO1lBRUYsTUFBTSxrQkFBa0IsR0FBRyxDQUN6Qix3Q0FBd0MsaUJBQWlCLENBQUMsSUFBSSxHQUFHO2dCQUNqRSwyQkFBMkIsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ2hELENBQUM7WUFJRixNQUFNLG1CQUFtQixHQUFRLE1BQU0sT0FBTyxDQUFDLGVBQWUsRUFBRSxFQUMxRCx3QkFBd0IsR0FBRyxhQUFhLENBQUMsc0JBQXNCLEVBQUUsRUFDakUsZ0JBQWdCLEdBQUc7Z0JBQ2pCLFNBQVMsRUFBSyxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRTtnQkFDMUMsWUFBWSxFQUFFLEVBQUUsR0FBRyxFQUFFLHdCQUF3QixFQUFFO2FBQ2hELEVBQ0QsV0FBVyxHQUFHLE1BQU0sbUNBQWdCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFHbEUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO2dCQUNsRCxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQ2YsQ0FBQztZQU9ELE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSTtnQkFDL0MsTUFBTSxzQkFBc0IsR0FBWSxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQ3RELFVBQVUsR0FBWSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBRS9DLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDckMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRTt3QkFDOUIsVUFBVSxFQUFFLGlCQUFHLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDO3dCQUM5QyxXQUFXLEVBQUUsSUFBSSxHQUFHLEVBQUU7cUJBQ3ZCLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUVELEdBQUcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbEUsTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNiLENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBOEIsQ0FBQyxDQUFDO1lBTTFDLE1BQU0sMkJBQTJCLEdBQUcsK0JBQXdCLENBQUMsaUJBQWlCLENBQUM7aUJBQzVFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLO2dCQUNqQixHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUMvQixNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ2IsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFxQixDQUFDLENBQUM7WUFFbkMsTUFBTSxTQUFTLEdBQW1DO2dCQUNoRCxRQUFRLEVBQUUsSUFBSSxHQUFHLEVBQXVCO2dCQUN4QyxRQUFRLEVBQUUsSUFBSSxHQUFHLEVBQXVCO2FBQ3pDLENBQUM7WUFLRixHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUUsY0FBYyxFQUFFLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxDQUFFLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFFMUUsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7Z0JBQ2hDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUM7b0JBQy9DLHFCQUFxQixLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUM7b0JBRTdDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sVUFBVSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQzlDLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQzt3QkFDckMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs0QkFFZixLQUFLLElBQUksQ0FBQzs0QkFDVixLQUFLLEtBQUs7Z0NBQ1IsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsVUFBVSxHQUFHLFVBQVUsQ0FBQyxDQUFDO2dDQUMvQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUN4QyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0NBQ2hELENBQUM7Z0NBQ0QsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsaUJBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dDQUMvRSxLQUFLLENBQUM7d0JBQ1YsQ0FBQzt3QkFDRCxtQkFBbUIsR0FBRyxJQUFJLENBQUM7b0JBQzdCLENBQUM7Z0JBRUgsQ0FBQztnQkFHRCxJQUFJLENBQUMsQ0FBQztvQkE4QkosTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUMsQ0FBQztvQkFFakUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDakIsTUFBTSxJQUFJLEtBQUssQ0FDYixHQUFHLGtCQUFrQixnQ0FBZ0M7NEJBQ3JELGVBQWUscUJBQXFCLFFBQVEsY0FBYyxpQkFBaUIsQ0FDNUUsQ0FBQztvQkFDSixDQUFDO29CQUdELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUV6QyxFQUFFLENBQUMsQ0FBQyxjQUFjLEtBQUsscUJBQXFCLENBQUMsQ0FBQyxDQUFDO3dCQUM3QyxNQUFNLElBQUksS0FBSyxDQUNiLHFDQUFxQyxxQkFBcUIsUUFBUSxjQUFjLGFBQWEsQ0FDOUYsQ0FBQztvQkFDSixDQUFDO29CQUdELEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDOUMsTUFBTSxJQUFJLEtBQUssQ0FDYixxQ0FBcUMscUJBQXFCLFFBQVEsY0FBYyxHQUFHOzRCQUNuRixrRkFBa0Y7NEJBQ2xGLDJDQUEyQyxxQkFBcUIsUUFBUSxjQUFjLEdBQUc7NEJBQ3pGLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQywrQkFBK0IscUJBQXFCLEVBQUUsQ0FDcEUsQ0FBQztvQkFDSixDQUFDO29CQUVELElBQUksV0FBVyxHQUFhLEVBQUUsRUFDMUIsV0FBVyxHQUFhLEVBQUUsQ0FBQztvQkFFL0IsR0FBRyxDQUFDLENBQUMsTUFBTSxVQUFVLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFFOUMsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUNyQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzRCQUVmLEtBQUssSUFBSTtnQ0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLGlCQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQ0FBQyxLQUFLLENBQUM7NEJBQzVFLEtBQUssS0FBSztnQ0FBRSxXQUFXLENBQUMsSUFBSSxDQUFDLGlCQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQ0FBQyxLQUFLLENBQUM7d0JBQzlFLENBQUM7b0JBQ0gsQ0FBQztvQkFFRCxNQUFNLGlCQUFpQixHQUFHLGlCQUFHLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLEVBQ3JELGNBQWMsR0FBRyxpQkFBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBRWhELFdBQVcsR0FBRyxNQUFNLGdDQUF5QixDQUFDLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQztvQkFDOUYsV0FBVyxHQUFHLE1BQU0sZ0NBQXlCLENBQUMsV0FBVyxFQUFFLGlCQUFpQixFQUFFLGNBQWMsQ0FBQyxDQUFDO29CQUs5RixJQUFJLGtCQUEwQixFQUMxQixrQkFBMEIsQ0FBQztvQkFDL0IsT0FBTyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUN2QixNQUFNLGNBQWMsR0FBRyxpQkFBRyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDNUQsY0FBYyxHQUFHLGlCQUFHLENBQUMsTUFBTSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFFckUsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDOzRCQUNwQixNQUFNLElBQUksS0FBSyxDQUNiLEdBQUcsa0JBQWtCLHdEQUF3RCxrQkFBa0IsRUFBRSxDQUNsRyxDQUFDO3dCQUNKLENBQUM7d0JBTUQsV0FBVyxHQUFHLE1BQU0sZ0NBQXlCLENBQUMsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQzt3QkFDM0YsV0FBVyxHQUFHLE1BQU0sZ0NBQXlCLENBQUMsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztvQkFDN0YsQ0FBQztvQkFNRCxNQUFNLG9CQUFvQixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO29CQUVyRCxNQUFNLGdCQUFnQixHQUFHLENBQUMsTUFBZSxLQUFLLENBQUMsRUFBVTt3QkFDdkQsTUFBTSxZQUFZLEdBQU0sTUFBTSxHQUFHLFVBQVUsR0FBRyxVQUFVLEVBQ2xELGVBQWUsR0FBRyxNQUFNLEdBQUcsVUFBVSxHQUFHLFVBQVUsQ0FBQzt3QkFFekQsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUN2RCxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQzt3QkFDL0QsQ0FBQzt3QkFJRCxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUM7NEJBQ3JELENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2xFLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQzVELENBQUM7b0JBQ0gsQ0FBQyxDQUFDO29CQUdGLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQzVDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQzdDLG1CQUFtQixHQUFHLElBQUksQ0FBQztnQkFDN0IsQ0FBQztnQkFFRCxFQUFFLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztvQkFDekIsTUFBTSxJQUFJLEtBQUssQ0FDYixHQUFHLGtCQUFrQixvQ0FBb0M7d0JBQ3pELGlEQUFpRCxjQUFjLEVBQUUsQ0FDbEUsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztZQUVELE1BQU0sbUJBQW1CLEdBQUcsc0JBQWUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLEVBQ3RGLG1CQUFtQixHQUFHLHNCQUFlLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRTlGLE1BQU0sVUFBVSxHQUFjLEVBQUUsRUFDMUIsV0FBVyxHQUFHLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQ2pELFdBQVcsR0FBRyxDQUFDLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDO1lBRXpELEVBQUUsQ0FBQyxDQUFDLFdBQVcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUc7b0JBQ25CLG1CQUFtQjtvQkFDbkIsbUJBQW1CO2lCQUNwQixDQUFDO1lBQ0osQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2pELENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDdkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUNqRCxDQUFDO1lBRUQsTUFBTSxDQUFhLFVBQVUsQ0FBQztRQUNoQyxDQUFDO0tBQUE7QUFJSCxDQUFDO0FBcmdDUSxxQkFBUyxHQUNzQixtQ0FBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG1DQUFnQixDQUNyRixDQUFDO0FBRUssK0JBQW1CLEdBQ3NCLG1DQUFnQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxtQ0FBZ0IsQ0FDekcsQ0FBQztBQUVLLDZCQUFpQixHQUNzQixtQ0FBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsbUNBQWdCLENBQ3JHLENBQUM7QUFFSyw2QkFBaUIsR0FDc0IsbUNBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLG1DQUFnQixDQUNyRyxDQUFDO0FBTUssMkJBQWUsR0FBRztJQUV2QixvQkFBb0IsQ0FDaEIsY0FBc0IsRUFDdEIsTUFBZSxFQUNmLGVBQWUsR0FBRyxpQkFBRyxDQUFDLEtBQUssQ0FBQyxJQUFJO1FBR2xDLE1BQU0sR0FBRyxHQUFrQixJQUFJLENBQUM7UUFDaEMsTUFBTSxDQUFDLG1DQUFnQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQzVGLENBQUM7SUFFRCxVQUFVLENBQ1IsY0FBc0IsRUFDdEIsZUFBZSxHQUFHLGlCQUFHLENBQUMsS0FBSyxDQUFDLElBQUk7UUFFaEMsTUFBTSxHQUFHLEdBQWtCLElBQUksQ0FBQztRQUNoQyxNQUFNLENBQUMsbUNBQWdCLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUVELGlCQUFpQixDQUFDLGdCQUF3QixFQUFFLGVBQWUsR0FBRyxpQkFBRyxDQUFDLEtBQUssQ0FBQyxJQUFJO1FBQzFFLE1BQU0sR0FBRyxHQUFrQixJQUFJLEVBQ3pCLE1BQU0sR0FBRyxtQ0FBZ0IsQ0FBQyxjQUFjLEVBQUUsRUFDMUMsY0FBYyxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQztZQUMzQyxNQUFNLEVBQUUsZ0JBQWdCO1lBQ3hCLFVBQVUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJO1NBQ2hDLENBQUMsQ0FBQztRQUVULE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsTUFBTSxDQUFDLGNBQXNCLEVBQUUsZUFBZSxHQUFHLGlCQUFHLENBQUMsS0FBSyxDQUFDLElBQUk7UUFDN0QsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBc0IsRUFBRSxlQUFlLEdBQUcsaUJBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSTtRQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDM0UsQ0FBQztJQUVELGFBQWEsQ0FBQyxnQkFBd0IsRUFBRSxlQUFlLEdBQUcsaUJBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSTtRQUN0RSxNQUFNLEdBQUcsR0FBa0IsSUFBSSxFQUN6QixNQUFNLEdBQUcsbUNBQWdCLENBQUMsY0FBYyxFQUFFLEVBQzFDLGNBQWMsR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUM7WUFDM0MsTUFBTSxFQUFFLGdCQUFnQjtZQUN4QixVQUFVLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSTtTQUNoQyxDQUFDLENBQUM7UUFFVCxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELFlBQVksQ0FBQyxnQkFBd0IsRUFBRSxlQUFlLEdBQUcsaUJBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSTtRQUNyRSxNQUFNLEdBQUcsR0FBa0IsSUFBSSxFQUN6QixNQUFNLEdBQUcsbUNBQWdCLENBQUMsY0FBYyxFQUFFLEVBQzFDLGNBQWMsR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUM7WUFDM0MsTUFBTSxFQUFFLGdCQUFnQjtZQUN4QixVQUFVLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSTtTQUNoQyxDQUFDLENBQUM7UUFFVCxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELGtCQUFrQixDQUFDLGNBQXNCLEVBQUUsZUFBZSxHQUFHLGlCQUFHLENBQUMsS0FBSyxDQUFDLElBQUk7UUFDekUsTUFBTSxHQUFHLEdBQWtCLElBQUksQ0FBQztRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDN0UsQ0FBQztDQUVGLENBQUM7QUE1RlMsbUJBQVcsY0EyZ0N2QixDQUFBIn0=