var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
import Tyr from 'tyranid';
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
    constructor() {
        this.resources = {};
        this.subjects = {};
    }
    boot(stage) {
        if (stage === 'post-link') {
            const collections = Tyr.collections;
        }
    }
    query(collection, permission) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = Tyr.local.user, queryObj = {};
            if (!user)
                return queryObj;
            const resource = this.resources[collection.def.id], subject = this.subjects[user.$model.def.id];
            const subjectHierarchyIds = yield subject.getHierarchyIds(), resourceHierarchyIds = yield resource.getHierarchyIds(), subjectType = subject.getName(), resourceType = resource.getName();
            const permissions = yield PermissionsModel.find({
                subjectId: { $in: subjectHierarchyIds },
                resourceId: { $in: resourceHierarchyIds },
                resourceType,
                subjectType
            });
            return queryObj;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztPQUFPLEdBQUcsTUFBTSxTQUFTO0FBUXpCLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUN4QyxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxpQkFBaUI7SUFDdkIsTUFBTSxFQUFFLGtCQUFrQjtJQUMxQixNQUFNLEVBQUU7UUFDTixTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFO1FBQ3hCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUM7UUFDL0IsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzlCLE1BQU0sRUFBRTtZQUNOLEVBQUUsRUFBRSxRQUFRO1lBQ1osSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUN0QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFDO1NBQ3RCO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFHSCxzQ0FBc0MsY0FBYztJQUVsRCxTQUFTLENBQUMsR0FBaUIsRUFBRSxNQUFlO1FBRTFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDYixDQUFDO0FBRUgsQ0FBQztBQUdEO0lBQUE7UUFHRSxjQUFTLEdBQW1CLEVBQUUsQ0FBQztRQUMvQixhQUFRLEdBQWtCLEVBQUUsQ0FBQztJQW1EL0IsQ0FBQztJQWhEQyxJQUFJLENBQUMsS0FBZ0I7UUFDbkIsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQztRQUt0QyxDQUFDO0lBQ0gsQ0FBQztJQU1LLEtBQUssQ0FBQyxVQUFrQyxFQUFFLFVBQWtCOztZQUNoRSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFDckIsUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUdwQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1lBRzNCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFDNUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFJbEQsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLE9BQU8sQ0FBQyxlQUFlLEVBQUUsRUFDckQsb0JBQW9CLEdBQUcsTUFBTSxRQUFRLENBQUMsZUFBZSxFQUFFLEVBQ3ZELFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQy9CLFlBQVksR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFeEMsTUFBTSxXQUFXLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7Z0JBQzlDLFNBQVMsRUFBRSxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRTtnQkFDdkMsVUFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFLG9CQUFvQixFQUFFO2dCQUN6QyxZQUFZO2dCQUNaLFdBQVc7YUFDWixDQUFDLENBQUM7WUFPSCxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2xCLENBQUM7S0FBQTtBQUdILENBQUM7QUFBQSJ9