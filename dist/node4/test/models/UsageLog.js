"use strict";

const tyranid_1 = require('tyranid');
exports.UsageLogBaseCollection = new tyranid_1.default.Collection({
    id: 'ul0',
    name: 'usagelog',
    dbName: 'usagelogs',
    fields: {
        _id: { is: 'mongoid' },
        text: { is: 'string' },
        graclResourcePermissionIds: { is: 'array', link: 'graclPermission', graclType: ['subject', 'resource'] }
    }
});
class UsageLog extends exports.UsageLogBaseCollection {}
exports.UsageLog = UsageLog;