"use strict";
const tyranid_1 = require('tyranid');
const UserBaseCollection = new tyranid_1.default.Collection({
    id: 'u00',
    name: 'user',
    dbName: 'users',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        teamIds: {
            is: 'array',
            of: {
                link: 'team',
                relate: 'ownedBy',
                graclType: ['subject', 'resource']
            }
        },
        organizationId: { link: 'organization' },
        graclResourcePermissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class User extends UserBaseCollection {
}
exports.User = User;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL1VzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBCQUFnQixTQUFTLENBQUMsQ0FBQTtBQUcxQixNQUFNLGtCQUFrQixHQUFHLElBQUksaUJBQUcsQ0FBQyxVQUFVLENBQUM7SUFDNUMsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsTUFBTTtJQUNaLE1BQU0sRUFBRSxPQUFPO0lBQ2YsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQ3RCLE9BQU8sRUFBRTtZQUNQLEVBQUUsRUFBRSxPQUFPO1lBQ1gsRUFBRSxFQUFFO2dCQUNGLElBQUksRUFBRSxNQUFNO2dCQUNaLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixTQUFTLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDO2FBQ25DO1NBQ0Y7UUFDRCxjQUFjLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFO1FBQ3hDLDBCQUEwQixFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7S0FDckU7Q0FDRixDQUFDLENBQUM7QUFHSCxtQkFBb0Qsa0JBQW1CO0FBRXZFLENBQUM7QUFGWSxZQUFJLE9BRWhCLENBQUEifQ==