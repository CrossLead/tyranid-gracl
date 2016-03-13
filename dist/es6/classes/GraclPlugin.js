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
const PermissionsModel_1 = require('../collections/PermissionsModel');
const gracl_1 = require('gracl');
class GraclPlugin {
    static makeRepository(collection) {
        return {
            getEntity(id) {
                return __awaiter(this, void 0, Promise, function* () {
                    return yield collection.byId(id);
                });
            },
            saveEntity(id, doc) {
                return __awaiter(this, void 0, Promise, function* () {
                    return yield doc.$save();
                });
            }
        };
    }
    boot(stage) {
        if (stage === 'post-link') {
            const collections = tyranid_1.default.collections, nodeSet = new Set();
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
            this.graph = new gracl_1.Graph({
                subjects: Array.from(schemaMaps.subjects.values()),
                resources: Array.from(schemaMaps.resources.values())
            });
        }
    }
    query(collection, permission, user = tyranid_1.default.local.user) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!this.graph) {
                throw new Error(`Must call this.boot() before using query method!`);
            }
            const queryObj = {};
            if (!user)
                return false;
            const ResourceClass = this.graph.getResource(collection.def.name), SubjectClass = this.graph.getSubject(user.$model.def.name);
            const subject = new SubjectClass(user);
            const subjectHierarchyIds = yield subject.getHierarchyIds(), subjectType = subject.getName(), resourceType = ResourceClass.displayName;
            const permissions = yield PermissionsModel_1.PermissionsModel.find({
                subjectId: { $in: subjectHierarchyIds },
                resourceType: resourceType
            });
            return queryObj;
        });
    }
}
exports.GraclPlugin = GraclPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFFQSwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFDMUIsbUNBQWlDLGlDQUFpQyxDQUFDLENBQUE7QUFDbkUsd0JBQWlFLE9BQU8sQ0FBQyxDQUFBO0FBYXpFO0lBSUUsT0FBTyxjQUFjLENBQUMsVUFBa0M7UUFDdEQsTUFBTSxDQUFDO1lBQ0MsU0FBUyxDQUFDLEVBQVU7O29CQUN4QixNQUFNLENBQUMsTUFBTSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO2FBQUE7WUFDSyxVQUFVLENBQUMsRUFBVSxFQUFFLEdBQWlCOztvQkFDNUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUMzQixDQUFDO2FBQUE7U0FDRixDQUFDO0lBQ0osQ0FBQztJQU1ELElBQUksQ0FBQyxLQUFnQjtRQUNuQixFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMxQixNQUFNLFdBQVcsR0FBRyxpQkFBRyxDQUFDLFdBQVcsRUFDN0IsT0FBTyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFFbEMsTUFBTSxhQUFhLEdBQUc7Z0JBQ3BCLFFBQVEsRUFBMEI7b0JBQ2hDLEtBQUssRUFBRSxFQUFFO29CQUNULE9BQU8sRUFBRSxFQUFFO2lCQUNaO2dCQUNELFNBQVMsRUFBMEI7b0JBQ2pDLEtBQUssRUFBRSxFQUFFO29CQUNULE9BQU8sRUFBRSxFQUFFO2lCQUNaO2FBQ0YsQ0FBQztZQUtGLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRztnQkFDckIsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUs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