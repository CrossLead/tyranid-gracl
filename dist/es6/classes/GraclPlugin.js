var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
import Tyr from 'tyranid';
import { Graph } from 'gracl/lib/index.ts';
const BaseCollection = new Tyr.Collection({
    id: 'gcp',
    name: 'graclPermission',
    dbName: 'graclPermissions',
    fields: {
        subjectId: { is: 'uid' },
        resourceId: { is: 'resourceId' },
        subjectType: { is: 'string' },
        resourceType: { is: 'string' },
        access: {
            is: 'object',
            keys: { is: 'string' },
            of: { is: 'boolean ' }
        }
    }
});
export class PermissionsModel extends BaseCollection {
    setAccess(doc, access) {
        return doc;
    }
}
export class GraclPlugin {
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
                const nodes = schemaMaps[type];
                for (const subject of schemaObjects[type].links) {
                    const name = subject.collection.def.name, parentName = subject.link.def.name;
                    nodes.set(name, { name,
                        parent: parentName,
                        parentId: subject.name,
                        repository: GraclPlugin.makeRepository(subject.collection)
                    });
                }
                for (const parent of schemaObjects[type].parents) {
                    const name = parent.def.name;
                    if (!nodes.has(name)) {
                        nodes.set(name, {
                            name,
                            repository: GraclPlugin.makeRepository(parent)
                        });
                    }
                }
            }
            this.graph = new Graph({
                subjects: Array.from(schemaMaps.subjects.values()),
                resources: Array.from(schemaMaps.resources.values())
            });
        }
    }
    query(collection, permission, user = Tyr.local.user) {
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
            const permissions = yield PermissionsModel.find({
                subjectId: { $in: subjectHierarchyIds },
                resourceType
            });
            return queryObj;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztPQUVPLEdBQUcsTUFBTSxTQUFTO09BQ2xCLEVBQXFCLEtBQUssRUFBYyxNQUFNLG9CQUFvQjtBQVF6RSxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDeEMsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsaUJBQWlCO0lBQ3ZCLE1BQU0sRUFBRSxrQkFBa0I7SUFDMUIsTUFBTSxFQUFFO1FBQ04sU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRTtRQUN4QixVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFDO1FBQy9CLFdBQVcsRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM5QixNQUFNLEVBQUU7WUFDTixFQUFFLEVBQUUsUUFBUTtZQUNaLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7WUFDdEIsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBQztTQUN0QjtLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBTUgsc0NBQXNDLGNBQWM7SUFFbEQsU0FBUyxDQUFDLEdBQWlCLEVBQUUsTUFBZTtRQUUxQyxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztBQUVILENBQUM7QUFHRDtJQUlFLE9BQU8sY0FBYyxDQUFDLFVBQWtDO1FBQ3RELE1BQU0sQ0FBQztZQUNDLFNBQVMsQ0FBQyxFQUFVOztvQkFDeEIsTUFBTSxDQUFDLE1BQU0sVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkMsQ0FBQzthQUFBO1lBQ0ssVUFBVSxDQUFDLEVBQVUsRUFBRSxHQUFpQjs7b0JBQzVDLE1B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