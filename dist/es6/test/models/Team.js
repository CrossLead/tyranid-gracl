"use strict";
const tyranid_1 = require('tyranid');
const TeamBaseCollection = new tyranid_1.default.Collection({
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
        graclResourcePermissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Team extends TeamBaseCollection {
}
exports.Team = Team;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL1RlYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBCQUFnQixTQUFTLENBQUMsQ0FBQTtBQUUxQixNQUFNLGtCQUFrQixHQUFHLElBQUksaUJBQUcsQ0FBQyxVQUFVLENBQUM7SUFDNUMsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsTUFBTTtJQUNaLE1BQU0sRUFBRSxPQUFPO0lBQ2YsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQ3RCLGNBQWMsRUFBRTtZQUNkLElBQUksRUFBRSxjQUFjO1lBQ3BCLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFNBQVMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUM7U0FDbkM7UUFDRCwwQkFBMEIsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFO0tBQ3JFO0NBQ0YsQ0FBQyxDQUFDO0FBR0gsbUJBQW9ELGtCQUFtQjtBQUV2RSxDQUFDO0FBRlksWUFBSSxPQUVoQixDQUFBIn0=