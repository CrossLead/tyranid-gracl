"use strict";
const tyranid_1 = require('tyranid');
const OrganizationBaseCollection = new tyranid_1.default.Collection({
    id: 'o00',
    name: 'organization',
    dbName: 'organizations',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        graclResourcePermissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Organization extends OrganizationBaseCollection {
}
exports.Organization = Organization;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3JnYW5pemF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vdGVzdC9tb2RlbHMvT3JnYW5pemF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFFMUIsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLGlCQUFHLENBQUMsVUFBVSxDQUFDO0lBQ3BELEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLGNBQWM7SUFDcEIsTUFBTSxFQUFFLGVBQWU7SUFDdkIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQ3RCLDBCQUEwQixFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7S0FDckU7Q0FDRixDQUFDLENBQUM7QUFFSCwyQkFBNEQsMEJBQTJCO0FBRXZGLENBQUM7QUFGWSxvQkFBWSxlQUV4QixDQUFBIn0=