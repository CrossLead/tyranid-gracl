"use strict";

const tyranid_1 = require('tyranid');
const OrganizationBaseCollection = new tyranid_1.default.Collection({
    id: 'o00',
    name: 'organization',
    dbName: 'organizations',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        permissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Organization extends OrganizationBaseCollection {}
exports.Organization = Organization;