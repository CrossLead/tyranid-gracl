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
class UsageLog extends exports.UsageLogBaseCollection {
}
exports.UsageLog = UsageLog;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNhZ2VMb2cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L21vZGVscy9Vc2FnZUxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFFbEIsOEJBQXNCLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDO0lBQ3ZELEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLFVBQVU7SUFDaEIsTUFBTSxFQUFFLFdBQVc7SUFDbkIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQ3RCLGFBQWEsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxDQUFFLFNBQVMsRUFBRSxVQUFVLENBQUUsRUFBRTtLQUM5RjtDQUNGLENBQUMsQ0FBQztBQUVILHVCQUF3RCw4QkFBdUI7QUFFL0UsQ0FBQztBQUZZLGdCQUFRLFdBRXBCLENBQUEifQ==