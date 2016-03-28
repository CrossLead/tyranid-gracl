"use strict";
const tyranid_1 = require('tyranid');
exports.InventoryBaseCollection = new tyranid_1.default.Collection({
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
        graclResourcePermissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Inventory extends exports.InventoryBaseCollection {
}
exports.Inventory = Inventory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW52ZW50b3J5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vdGVzdC9tb2RlbHMvSW52ZW50b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFFYiwrQkFBdUIsR0FBRyxJQUFJLGlCQUFHLENBQUMsVUFBVSxDQUFDO0lBQ3hELEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLFdBQVc7SUFDakIsTUFBTSxFQUFFLGFBQWE7SUFDckIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQ3RCLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUNwQyxjQUFjLEVBQUU7WUFDZCxJQUFJLEVBQUUsY0FBYztZQUNwQixNQUFNLEVBQUUsU0FBUztZQUNqQixTQUFTLEVBQUUsVUFBVTtTQUN0QjtRQUNELDBCQUEwQixFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7S0FDckU7Q0FDRixDQUFDLENBQUM7QUFFSCx3QkFBeUQsK0JBQXdCO0FBRWpGLENBQUM7QUFGWSxpQkFBUyxZQUVyQixDQUFBIn0=