"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Tyr = require('tyranid');
const GraclPlugin_1 = require('../classes/GraclPlugin');
exports.PermissionsBaseCollection = new Tyr.Collection({
    id: 'gcp',
    name: 'graclPermission',
    dbName: 'graclPermissions',
    fields: {
        _id: { is: 'mongoid' },
        subjectId: { is: 'uid' },
        resourceId: { is: 'uid' },
        subjectType: { is: 'string' },
        resourceType: { is: 'string' },
        access: {
            is: 'object',
            keys: { is: 'string' },
            of: { is: 'boolean' }
        }
    }
});
let graclPluginInstance;
class PermissionsModel extends exports.PermissionsBaseCollection {
    static setAccess(doc, access) {
        return __awaiter(this, void 0, Promise, function* () {
            return doc;
        });
    }
    static updatePermissions(doc, graclType) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    static deletePermissions(doc, graclType) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    static getGraclPlugin() {
        return graclPluginInstance || (graclPluginInstance = new GraclPlugin_1.GraclPlugin());
    }
}
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQiw4QkFBNEIsd0JBQXdCLENBQUMsQ0FBQTtBQUd4QyxpQ0FBeUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDMUQsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsaUJBQWlCO0lBQ3ZCLE1BQU0sRUFBRSxrQkFBa0I7SUFDMUIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFO1FBQ3hCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDekIsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzlCLE1BQU0sRUFBRTtZQUNOLEVBQUUsRUFBRSxRQUFRO1lBQ1osSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUN0QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1NBQ3RCO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFHSCxJQUFJLG1CQUFnQyxDQUFDO0FBT3JDLCtCQUFnRSxpQ0FBMEI7SUFFeEYsT0FBYSxTQUFTLENBQUMsR0FBaUIsRUFBRSxNQUFlOztZQUV2RCxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ2IsQ0FBQztLQUFBO0lBRUQsT0FBYSxpQkFBaUIsQ0FBQyxHQUFpQixFQUFFLFNBQWlCOztRQUVuRSxDQUFDO0tBQUE7SUFFRCxPQUFhLGlCQUFpQixDQUFDLEdBQWlCLEVBQUUsU0FBaUI7O1FBRW5FLENBQUM7S0FBQTtJQUVELE9BQU8sY0FBYztRQUNuQixNQUFNLENBQUMsbUJBQW1CLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLHlCQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzFFLENBQUM7QUFFSCxDQUFDO0FBbkJZLHdCQUFnQixtQkFtQjVCLENBQUEifQ==