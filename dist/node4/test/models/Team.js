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
class Team extends TeamBaseCollection {}
exports.Team = Team;