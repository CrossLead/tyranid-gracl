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
    name: '_graclPermissions',
    dbName: '_graclPermissions',
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
    setViewAccess(doc, access) {
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
            const subjectId = subject.getId();
            const permissions = yield PermissionsModel.find({});
            return queryObj;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztPQUNPLEdBQUcsTUFBTSxTQUFTO0FBWXpCLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUN4QyxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxtQkFBbUI7SUFDekIsTUFBTSxFQUFFLG1CQUFtQjtJQUMzQixNQUFNLEVBQUU7UUFDTixTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFO1FBQ3hCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUM7UUFDL0IsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzlCLE1BQU0sRUFBRTtZQUNOLEVBQUUsRUFBRSxRQUFRO1lBQ1osSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUN0QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFDO1NBQ3RCO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFJSCxzQ0FBc0MsY0FBYztJQUVsRCxhQUFhLENBQUMsR0FBaUIsRUFBRSxNQUFlO1FBQzlDLE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDYixDQUFDO0FBRUgsQ0FBQztBQUlEO0lBQUE7UUFFRSxjQUFTLEdBQW1CLEVBQUUsQ0FBQztRQUMvQixhQUFRLEdBQWtCLEVBQUUsQ0FBQztJQWdDL0IsQ0FBQztJQTlCQyxJQUFJLENBQUMsS0FBZ0I7UUFDbkIsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQztRQUt0QyxDQUFDO0lBQ0gsQ0FBQztJQUtLLEtBQUssQ0FBQyxVQUFrQyxFQUFFLFVBQWtCOztZQUNoRSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFDckIsUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUdwQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1lBRTNCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFDNUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFbEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRWxDLE1BQU0sV0FBVyxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUcsQ0FBQyxDQUFDO1lBRXJELE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDbEIsQ0FBQztLQUFBO0FBRUgsQ0FBQztBQUFBIn0=