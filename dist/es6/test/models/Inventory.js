"use strict";
const Tyr = require('tyranid');
exports.InventoryBaseCollection = new Tyr.Collection({
    id: 'i00',
    name: 'inventory',
    dbName: 'inventories',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        items: { is: 'array', of: 'string' },
        organizationId: {
            link: 'organization',
            relate: 'ownedBy',
            graclType: 'resource'
        },
        permissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Inventory extends exports.InventoryBaseCollection {
}
exports.Inventory = Inventory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW52ZW50b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vdGVzdC9tb2RlbHMvSW52ZW50b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUVsQiwrQkFBdUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDeEQsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsV0FBVztJQUNqQixNQUFNLEVBQUUsYUFBYTtJQUNyQixNQUFNLEVBQUU7UUFDTixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3RCLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDdEIsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQ3BDLGNBQWMsRUFBRTtZQUNkLElBQUksRUFBRSxjQUFjO1lBQ3BCLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFNBQVMsRUFBRSxVQUFVO1NBQ3RCO1FBQ0QsYUFBYSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7S0FDeEQ7Q0FDRixDQUFDLENBQUM7QUFFSCx3QkFBeUQsK0JBQXdCO0FBRWpGLENBQUM7QUFGWSxpQkFBUyxZQUVyQixDQUFBIn0=