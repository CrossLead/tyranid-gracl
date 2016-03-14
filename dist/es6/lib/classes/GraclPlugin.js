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
exports.collectionLinkCache = {};
function getCollectionLinks(collection, linkParams) {
    let paramHash = '|collection:' + collection.name + '|';
    if (linkParams.direction)
        paramHash += 'direction:' + linkParams.direction + '|';
    if (linkParams.relate)
        paramHash += 'relate:' + linkParams.relate + '|';
    if (exports.collectionLinkCache[paramHash])
        return exports.collectionLinkCache[paramHash];
    return exports.collectionLinkCache[paramHash] = collection.links(linkParams);
}
exports.getCollectionLinks = getCollectionLinks;
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
            const links = getCollectionLinks(col, { relate: 'ownedBy', direction: 'outgoing' }), colName = col.name;
            _.each(links, linkField => {
                const edges = _.get(g, colName, new Set()), linkName = linkField.link.name;
                edges.add(linkName);
                _.set(g, linkName, _.get(g, linkName, new Set()));
                _.set(g, colName, edges);
            });
        });
        const dist = {}, next = {}, paths = {}, keys = _.keys(g);
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
        _.each(keys, a => {
            _.each(keys, b => {
                const originalEdge = `${a}.${b}`;
                if (!_.get(next, originalEdge))
                    return;
                const path = [a];
                while (a !== b) {
                    a = _.get(next, `${a}.${b}`);
                    if (!a)
                        return;
                    path.push(a);
                }
                return _.set(paths, originalEdge, path);
            });
        });
        return paths;
    }
    ;
    log(message) {
        if (this.verbose) {
            console.log(`tyranid-gracl: ${message}`);
        }
        return this;
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
                const linkFields = getCollectionLinks(col, { relate: 'ownedBy', direction: 'outgoing' }), collectionName = col.def.name;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFFQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixtQ0FBaUMsaUNBQWlDLENBQUMsQ0FBQTtBQUNuRSxNQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUMvQixNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQW9CZiwyQkFBbUIsR0FBc0IsRUFBRSxDQUFDO0FBQ3pELDRCQUFtQyxVQUFrQyxFQUFFLFVBQWU7SUFDcEYsSUFBSSxTQUFTLEdBQUcsY0FBYyxHQUFHLFVBQVUsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO0lBQ3ZELEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7UUFBQyxTQUFTLElBQUksWUFBWSxHQUFHLFVBQVUsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO0lBQ2pGLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFBSSxTQUFTLElBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQzNFLEVBQUUsQ0FBQyxDQUFDLDJCQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQUMsTUFBTSxDQUFDLDJCQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzFFLE1BQU0sQ0FBQywyQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3ZFLENBQUM7QUFOZSwwQkFBa0IscUJBTWpDLENBQUE7QUFHRCx5QkFDa0IsR0FBMEIsRUFDMUIsaUJBQXlDLEVBQ3pDLEdBQVc7SUFFM0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1NBQzdCLE1B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