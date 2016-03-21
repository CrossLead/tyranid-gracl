"use strict";
const Tyr = require('tyranid');
const UserBaseCollection = new Tyr.Collection({
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
                graclType: 'subject'
            }
        },
        organizationId: { link: 'organization' },
        permissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class User extends UserBaseCollection {
}
exports.User = User;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL1VzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBRy9CLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDO0lBQzVDLEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLE1BQU07SUFDWixNQUFNLEVBQUUsT0FBTztJQUNmLE1BQU0sRUFBRTtRQUNOLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7UUFDdEIsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUN0QixPQUFPLEVBQUU7WUFDUCxFQUFFLEVBQUUsT0FBTztZQUNYLEVBQUUsRUFBRTtnQkFDRixJQUFJLEVBQUUsTUFBTTtnQkFDWixNQUFNLEVBQUUsU0FBUztnQkFDakIsU0FBUyxFQUFFLFNBQVM7YUFDckI7U0FDRjtRQUNELGNBQWMsRUFBRSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUU7UUFDeEMsYUFBYSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7S0FDeEQ7Q0FDRixDQUFDLENBQUM7QUFHSCxtQkFBb0Qsa0JBQW1CO0FBRXZFLENBQUM7QUFGWSxZQUFJLE9BRWhCLENBQUEifQ==