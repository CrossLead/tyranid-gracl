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
const PermissionsModel_1 = require('../collections/PermissionsModel');
const gracl = require('gracl');
const _ = require('lodash');
function createInQueries(map, queriedCollection, key) {
    return Array.from(map.entries())
        .reduce((out, [col, uids]) => {
        if (col === queriedCollection.def.name) {
            col = queriedCollection.def.primaryKey.field;
        }
        out[col] = { [key]: uids.map((u) => Tyr.parseUid(u).id) };
        return out;
    }, {});
}
exports.createInQueries = createInQueries;
;
class GraclPlugin {
    constructor(verbose = false) {
        this.verbose = verbose;
    }
    static makeRepository(collection) {
        return {
            getEntity(id) {
                return __awaiter(this, void 0, Promise, function* () {
                    return (yield collection.populate('permissions', yield collection.byId(id)));
                });
            },
            saveEntity(id, doc) {
                return __awaiter(this, void 0, Promise, function* () {
                    yield PermissionsModel_1.PermissionsModel.updatePermissions(doc, 'subject');
                    return yield doc.$save();
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
                    const name = node.collection.def.name, parentName = node.link.def.name;
                    nodes.set(name, { name: name,
                        parent: parentName,
                        parentId: node.name === node.path ?
                            node.name :
                            node.path.split('.')[0],
                        repository: GraclPlugin.makeRepository(node.collection)
                    });
                }
                for (const parent of tyrObjects.parents) {
                    const name = parent.def.name;
                    if (!nodes.has(name)) {
                        nodes.set(name, {
                            name: name,
                            repository: GraclPlugin.makeRepository(parent)
                        });
                    }
                }
            }
            this.log(`creating link graph.`);
            this.outgoingLinkPaths = GraclPlugin.buildLinkGraph();
            this.log(`creating gracl hierarchy`);
            this.graclHierarchy = new gracl.Graph({
                subjects: Array.from(schemaMaps.subjects.values()),
                resources: Array.from(schemaMaps.resources.values())
            });
        }
    }
    query(queriedCollection, permissionType, user = Tyr.local.user) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!this.graclHierarchy) {
                throw new Error(`Must call this.boot() before using this.query()!`);
            }
            if (!user)
                return false;
            const ResourceClass = this.graclHierarchy.getResource(queriedCollection.def.name), SubjectClass = this.graclHierarchy.getSubject(user.$model.def.name);
            const subject = new SubjectClass(user);
            const errorMessageHeader = (`Unable to construct query object for ${queriedCollection.name} ` +
                `from the perspective of ${subject.toString()}`);
            const subjectHierarchyIds = yield subject.getHierarchyIds(), resourceHierarchyClasses = ResourceClass.getHierarchyClassNames();
            const permissions = yield PermissionsModel_1.PermissionsModel.find({
                subjectId: { $in: subjectHierarchyIds },
                resourceType: { $in: resourceHierarchyClasses }
            });
            if (!Array.isArray(permissions))
                return false;
            const resourceMap = new Map();
            for (const perm of permissions) {
                const resourceCollectionName = perm['resourceType'], resourceId = perm['resourceId'];
                if (!resourceMap.has(resourceCollectionName)) {
                    resourceMap.set(resourceCollectionName, {
                        collection: Tyr.byName[resourceCollectionName],
                        permissions: new Map
                    });
                }
                resourceMap
                    .get(resourceCollectionName)
                    .permissions
                    .set(resourceId, perm);
            }
            const queriedCollectionLinkFields = new Map();
            queriedCollection
                .links({ direction: 'outgoing' })
                .forEach(field => {
                queriedCollectionLinkFields.set(field.def.link, field);
            });
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
                                    queryMaps[key].set(collectionName, [permission.resourceId]);
                                }
                                else {
                                    queryMaps[key].get(collectionName).push(permission.resourceId);
                                }
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
                    let pathCollectionName;
                    while (pathCollectionName = path.pop()) {
                        const pathCollection = Tyr.byName[pathCollectionName];
                    }
                }
                if (!queryRestrictionSet) {
                    throw new Error(`${errorMessageHeader}, unable to set query restriction ` +
                        `to satisfy permissions relating to collection ${collectionName}`);
                }
            }
            return {
                $and: [
                    createInQueries(queryMaps['positive'], queriedCollection, '$in'),
                    createInQueries(queryMaps['negative'], queriedCollection, '$nin')
                ]
            };
        });
    }
}
exports.GraclPlugin = GraclPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFFQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixtQ0FBaUMsaUNBQWlDLENBQUMsQ0FBQTtBQUNuRSxNQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUMvQixNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQWdCNUIseUJBQ2tCLEdBQTBCLEVBQzFCLGlCQUF5QyxFQUN6QyxHQUFXO0lBRTNCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUM3QixNQUFNLENBQUMsQ0FBQyxHQUF5QixFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztRQUU3QyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdkMsR0FBRyxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO1FBQy9DLENBQUM7UUFDRCxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFTLEtBQUssR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDYixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDWCxDQUFDO0FBZGUsdUJBQWUsa0JBYzlCLENBQUE7QUFBQSxDQUFDO0FBSUY7SUF3RkUsWUFBbUIsT0FBTyxHQUFHLEtBQUs7UUFBZixZQUFPLEdBQVAsT0FBTyxDQUFRO0lBQUcsQ0FBQztJQXBGdEMsT0FB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