"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
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
        return __awaiter(this, void 0, Promise, function* () {
            return doc;
        });
    }
    deletePermissionsForSubject(doc) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
}
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9jb2xsZWN0aW9ucy9QZXJtaXNzaW9uc01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBLDBCQUFnQixTQUFTLENBQUMsQ0FBQTtBQUdiLGlDQUF5QixHQUFHLElBQUksaUJBQUcsQ0FBQyxVQUFVLENBQUM7SUFDMUQsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsaUJBQWlCO0lBQ3ZCLE1BQU0sRUFBRSxrQkFBa0I7SUFDMUIsTUFBTSxFQUFFO1FBQ04sU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRTtRQUN4QixVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFDO1FBQy9CLFdBQVcsRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDN0IsWUFBWSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM5QixNQUFNLEVBQUU7WUFDTixFQUFFLEVBQUUsUUFBUTtZQUNaLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7WUFDdEIsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBQztTQUN0QjtLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBUUgsK0JBQWdFLGlDQUEwQjtJQUVsRixTQUFTLENBQUMsR0FBaUIsRUFBRSxNQUFlOztZQUVoRCxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ2IsQ0FBQztLQUFBO0lBRUssMkJBQTJCLENBQUMsR0FBaUI7O1FBRW5ELENBQUM7S0FBQTtBQUVILENBQUM7QUFYWSx3QkFBZ0IsbUJBVzVCLENBQUEifQ==