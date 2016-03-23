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
        permissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Team extends TeamBaseCollection {}
exports.Team = Team;