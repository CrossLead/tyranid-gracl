"use strict";

const Tyr = require('tyranid');
exports.UsageLogBaseCollection = new Tyr.Collection({
    id: 'ul0',
    name: 'usagelog',
    dbName: 'usagelogs',
    fields: {
        _id: { is: 'mongoid' },
        text: { is: 'string' },
        permissionIds: { is: 'array', link: 'graclPermission', graclType: ['subject', 'resource'] }
    }
});
class UsageLog extends exports.UsageLogBaseCollection {}
exports.UsageLog = UsageLog;