"use strict";
const tyranid_1 = require('tyranid');
const UserBaseCollection = new tyranid_1.default.Collection({
    id: 'u00',
    name: 'user',
    dbName: 'users',
    fields: {
        name: { is: 'string' },
        teamIds: {
            is: 'array',
            of: {
                link: 'team',
                relates: 'ownedBy',
                direction: 'outgoing',
                graclType: 'subject'
            }
        },
        organizationId: { link: 'organization' },
        permissions: { link: 'graclPermission' }
    }
});
class User extends UserBaseCollection {
}
exports.User = User;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL1VzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBCQUFnQixTQUFTLENBQUMsQ0FBQTtBQUcxQixNQUFNLGtCQUFrQixHQUFHLElBQUksaUJBQUcsQ0FBQyxVQUFVLENBQUM7SUFDNUMsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsTUFBTTtJQUNaLE1BQU0sRUFBRSxPQUFPO0lBQ2YsTUFBTSxFQUFFO1FBQ04sSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUN0QixPQUFPLEVBQUU7WUFDUCxFQUFFLEVBQUUsT0FBTztZQUNYLEVBQUUsRUFBRTtnQkFDRixJQUFJLEVBQUUsTUFBTTtnQkFDWixPQUFPLEVBQUUsU0FBUztnQkFDbEIsU0FBUyxFQUFFLFVBQVU7Z0JBQ3JCLFNBQVMsRUFBRSxTQUFTO2FBQ3JCO1NBQ0Y7UUFDRCxjQUFjLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFO1FBQ3hDLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRTtLQUN6QztDQUNGLENBQUMsQ0FBQztBQUdILG1CQUFvRCxrQkFBbUI7QUFFdkUsQ0FBQztBQUZZLFlBQUksT0FFaEIsQ0FBQSJ9