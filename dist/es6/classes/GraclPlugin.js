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
class PermissionsModel extends BaseCollection {
}
export class GraclPlugin {
    query(collection, permission) {
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JhY2xQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvY2xhc3Nlcy9HcmFjbFBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiT0FDTyxHQUFHLE1BQU0sU0FBUztBQUd6QixNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDeEMsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsbUJBQW1CO0lBQ3pCLE1BQU0sRUFBRSxtQkFBbUI7SUFDM0IsTUFBTSxFQUFFO1FBQ04sU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRTtRQUN4QixVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFDO1FBQy9CLFdBQVcsRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM5QixNQUFNLEVBQUU7WUFDTixFQUFFLEVBQUUsUUFBUTtZQUNaLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7WUFDdEIsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBQztTQUN0QjtLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBSUgsK0JBQStCLGNBQWM7QUFFN0MsQ0FBQztBQUlEO0lBS0UsS0FBSyxDQUFDLFVBQTBCLEVBQUUsVUFBa0I7SUFFcEQsQ0FBQztBQUVILENBQUM7QUFBQSJ9