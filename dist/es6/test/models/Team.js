"use strict";
const tyranid_1 = require('tyranid');
const TeamBaseCollection = new tyranid_1.default.Collection({
    id: 't00',
    name: 'team',
    dbName: 'teams',
    fields: {
        name: { is: 'string' },
        organizationId: {
            link: 'organzization',
            relates: 'ownedBy',
            direction: 'outgoing',
            graclType: 'subject'
        },
        permissions: { link: 'graclPermission' }
    }
});
class Team extends TeamBaseCollection {
}
exports.Team = Team;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL1RlYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBCQUFnQixTQUFTLENBQUMsQ0FBQTtBQUUxQixNQUFNLGtCQUFrQixHQUFHLElBQUksaUJBQUcsQ0FBQyxVQUFVLENBQUM7SUFDNUMsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsTUFBTTtJQUNaLE1BQU0sRUFBRSxPQUFPO0lBQ2YsTUFBTSxFQUFFO1FBQ04sSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUN0QixjQUFjLEVBQUU7WUFDZCxJQUFJLEVBQUUsZUFBZTtZQUNyQixPQUFPLEVBQUUsU0FBUztZQUNsQixTQUFTLEVBQUUsVUFBVTtZQUNyQixTQUFTLEVBQUUsU0FBUztTQUNyQjtRQUNELFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRTtLQUN6QztDQUNGLENBQUMsQ0FBQztBQUdILG1CQUFvRCxrQkFBbUI7QUFFdkUsQ0FBQztBQUZZLFlBQUksT0FFaEIsQ0FBQSJ9