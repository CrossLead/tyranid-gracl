"use strict";
const Tyr = require('tyranid');
const TeamBaseCollection = new Tyr.Collection({
    id: 't00',
    name: 'team',
    dbName: 'teams',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        organizationId: {
            link: 'organization',
            relate: 'ownedBy',
            graclType: ['subject', 'resource']
        },
        permissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Team extends TeamBaseCollection {
}
exports.Team = Team;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL1RlYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBRS9CLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDO0lBQzVDLEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLE1BQU07SUFDWixNQUFNLEVBQUUsT0FBTztJQUNmLE1BQU0sRUFBRTtRQUNOLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7UUFDdEIsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUN0QixjQUFjLEVBQUU7WUFDZCxJQUFJLEVBQUUsY0FBYztZQUNwQixNQUFNLEVBQUUsU0FBUztZQUNqQixTQUFTLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDO1NBQ25DO1FBQ0QsYUFBYSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7S0FDeEQ7Q0FDRixDQUFDLENBQUM7QUFHSCxtQkFBb0Qsa0JBQW1CO0FBRXZFLENBQUM7QUFGWSxZQUFJLE9BRWhCLENBQUEifQ==