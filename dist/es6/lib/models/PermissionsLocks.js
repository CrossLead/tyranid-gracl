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
class PermissionLocks extends exports.PermissionLockBaseCollection {
}
exports.PermissionLocks = PermissionLocks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNMb2Nrcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNMb2Nrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsMEJBQWdCLFNBQVMsQ0FBQyxDQUFBO0FBR2Isb0NBQTRCLEdBQUcsSUFBSSxpQkFBRyxDQUFDLFVBQVUsQ0FBQztJQUM3RCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxxQkFBcUI7SUFDM0IsTUFBTSxFQUFFLHNCQUFzQjtJQUM5QixNQUFNLEVBQUU7UUFDTixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3RCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDekIsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtLQUMxQjtDQUNGLENBQUMsQ0FBQztBQUdILDhCQUErRCxvQ0FBNkI7QUFBRSxDQUFDO0FBQWxGLHVCQUFlLGtCQUFtRSxDQUFBIn0=