"use strict";

const Tyr = require('tyranid');
exports.PermissionLockBaseCollection = new Tyr.Collection({
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