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
        if (col === queriedCollection.name) {
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
            const links = col.links({ relate: 'ownedBy', direction: 'outgoing' }), colName = col.name;
            _.each(links, linkField => {
                const edges = _.get(g, colName, new Set()), linkName = linkField.link.name;
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
        let a = colA.name, b = colB.name, originalEdge = `${a}.${b}`, next = this.shortestLinkPaths;
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
                        parentId: node.name,
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
            this.shortestLinkPaths = GraclPlugin.buildLinkGraph();
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
                    const path = this.shortestLinkPaths[queriedCollection.name][collectionName];
                    if (!path) {
                        throw new Error(`${errorMessageHeader}, as there is no path between ` +
                            `collections ${queriedCollection.name} and ${collectionName} in the schema.`);
                    }
                    console.log(`NEED TO IMPLEMENT PATH COLLECTION FOR QUERY`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFFQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixtQ0FBaUMsaUNBQWlDLENBQUMsQ0FBQTtBQUNuRSxNQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUMvQixNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQWdCNUIseUJBQ2tCLEdBQTBCLEVBQzFCLGlCQUF5QyxFQUN6QyxHQUFXO0lBRTNCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUM3QixNQUFNLENBQUMsQ0FBQyxHQUF5QixFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQztRQUU3QyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNuQyxHQUFHLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDL0MsQ0FBQztRQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQVMsS0FBSyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDbEUsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNiLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNYLENBQUM7QUFkZSx1QkFBZSxrQkFjOUIsQ0FBQTtBQUFBLENBQUM7QUFJRjtJQXlGRSxZQUFtQixPQUFPLEdBQUcsS0FBSztRQUFmLFlBQU8sR0FBUCxPQUFPLENBQVE7SUFBRyxDQUFDO0lBckZ0QyxPQUFPLGNBQWMsQ0FB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