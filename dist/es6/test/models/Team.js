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
            graclType: 'subject'
        },
        permissions: { link: 'graclPermission' }
    }
});
class Team extends TeamBaseCollection {
}
exports.Team = Team;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL1RlYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBRS9CLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDO0lBQzVDLEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLE1BQU07SUFDWixNQUFNLEVBQUUsT0FBTztJQUNmLE1BQU0sRUFBRTtRQUNOLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7UUFDdEIsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUN0QixjQUFjLEVBQUU7WUFDZCxJQUFJLEVBQUUsY0FBYztZQUNwQixNQUFNLEVBQUUsU0FBUztZQUNqQixTQUFTLEVBQUUsU0FBUztTQUNyQjtRQUNELFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRTtLQUN6QztDQUNGLENBQUMsQ0FBQztBQUdILG1CQUFvRCxrQkFBbUI7QUFFdkUsQ0FBQztBQUZZLFlBQUksT0FFaEIsQ0FBQSJ9