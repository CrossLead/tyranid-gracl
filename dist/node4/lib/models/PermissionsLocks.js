"use strict";

const tyranid_1 = require('tyranid');
exports.PermissionLockBaseCollection = new tyranid_1.default.Collection({
    id: '_gl',
    name: 'graclPermissionLock',
    dbName: 'graclPermissionLocks',
    fields: {
        _id: { is: 'mongoid' },
        resourceId: { is: 'uid' },
        locked: { is: 'boolean' }
    }
});
class PermissionLocks extends exports.PermissionLockBaseCollection {}
exports.PermissionLocks = PermissionLocks;