"use strict";
const tyranid_1 = require('tyranid');
exports.PermissionsBaseCollection = new tyranid_1.default.Collection({
    id: 'gcp',
    name: 'graclPermission',
    dbName: 'graclPermissions',
    fields: {
        subjectId: { is: 'uid' },
        resourceId: { is: 'resourceId' },
        subjectType: { is: 'string' },
        resourceType: { is: 'string' },
        access: {
            is: 'object',
            keys: { is: 'string' },
            of: { is: 'boolean ' }
        }
    }
});
class PermissionsModel extends exports.PermissionsBaseCollection {
    setAccess(doc, access) {
        return doc;
    }
}
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9jb2xsZWN0aW9ucy9QZXJtaXNzaW9uc01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFHYixpQ0FBeUIsR0FBRyxJQUFJLGlCQUFHLENBQUMsVUFBVSxDQUFDO0lBQzFELEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLGlCQUFpQjtJQUN2QixNQUFNLEVBQUUsa0JBQWtCO0lBQzFCLE1BQU0sRUFBRTtRQUNOLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDeEIsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBQztRQUMvQixXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzdCLFlBQVksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDOUIsTUFBTSxFQUFFO1lBQ04sRUFBRSxFQUFFLFFBQVE7WUFDWixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1lBQ3RCLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUM7U0FDdEI7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUdILCtCQUFnRSxpQ0FBMEI7SUFFeEYsU0FBUyxDQUFDLEdBQWlCLEVBQUUsTUFBZTtRQUUxQyxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztBQUVILENBQUM7QUFQWSx3QkFBZ0IsbUJBTzVCLENBQUEifQ==