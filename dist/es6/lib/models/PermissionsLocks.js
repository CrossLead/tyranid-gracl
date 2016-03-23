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
class PermissionLocks extends exports.PermissionLockBaseCollection {
}
exports.PermissionLocks = PermissionLocks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNMb2Nrcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNMb2Nrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFFbEIsb0NBQTRCLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDO0lBQzdELEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLHFCQUFxQjtJQUMzQixNQUFNLEVBQUUsc0JBQXNCO0lBQzlCLE1BQU0sRUFBRTtRQUNOLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7UUFDdEIsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRTtRQUN6QixNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO0tBQzFCO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsOEJBQStELG9DQUE2QjtBQUU1RixDQUFDO0FBRlksdUJBQWUsa0JBRTNCLENBQUEifQ==