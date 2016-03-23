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
class User extends UserBaseCollection {}
exports.User = User;