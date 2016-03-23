"use strict";

const Tyr = require('tyranid');
const OrganizationBaseCollection = new Tyr.Collection({
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