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
class User extends UserBaseCollection {}
exports.User = User;