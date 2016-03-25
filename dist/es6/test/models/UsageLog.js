"use strict";
const tyranid_1 = require('tyranid');
exports.UsageLogBaseCollection = new tyranid_1.default.Collection({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNhZ2VMb2cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L21vZGVscy9Vc2FnZUxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMEJBQWdCLFNBQVMsQ0FBQyxDQUFBO0FBRWIsOEJBQXNCLEdBQUcsSUFBSSxpQkFBRyxDQUFDLFVBQVUsQ0FBQztJQUN2RCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxVQUFVO0lBQ2hCLE1BQU0sRUFBRSxXQUFXO0lBQ25CLE1BQU0sRUFBRTtRQUNOLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7UUFDdEIsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUN0QixhQUFhLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsQ0FBRSxTQUFTLEVBQUUsVUFBVSxDQUFFLEVBQUU7S0FDOUY7Q0FDRixDQUFDLENBQUM7QUFFSCx1QkFBd0QsOEJBQXVCO0FBRS9FLENBQUM7QUFGWSxnQkFBUSxXQUVwQixDQUFBIn0=