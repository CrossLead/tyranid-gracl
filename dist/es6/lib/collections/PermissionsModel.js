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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9jb2xsZWN0aW9ucy9QZXJtaXNzaW9uc01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQy9CLDhCQUE0Qix3QkFBd0IsQ0FBQyxDQUFBO0FBR3hDLGlDQUF5QixHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUMxRCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxpQkFBaUI7SUFDdkIsTUFBTSxFQUFFLGtCQUFrQjtJQUMxQixNQUFNLEVBQUU7UUFDTixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3RCLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDeEIsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRTtRQUN6QixXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzdCLFlBQVksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDOUIsTUFBTSxFQUFFO1lBQ04sRUFBRSxFQUFFLFFBQVE7WUFDWixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1lBQ3RCLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7U0FDdEI7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUdILElBQUksbUJBQWdDLENBQUM7QUFPckMsK0JBQWdFLGlDQUEwQjtJQUV4RixPQUFhLFNBQVMsQ0FBQyxHQUFpQixFQUFFLE1BQWU7O1lBRXZELE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDYixDQUFDO0tBQUE7SUFFRCxPQUFhLGlCQUFpQixDQUFDLEdBQWlCLEVBQUUsU0FBaUI7O1FBRW5FLENBQUM7S0FBQTtJQUVELE9BQWEsaUJBQWlCLENBQUMsR0FBaUIsRUFBRSxTQUFpQjs7UUFFbkUsQ0FBQztLQUFBO0lBRUQsT0FBTyxjQUFjO1FBQ25CLE1BQU0sQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUkseUJBQVcsRUFBRSxDQUFDLENBQUM7SUFDMUUsQ0FBQztBQUVILENBQUM7QUFuQlksd0JBQWdCLG1CQW1CNUIsQ0FBQSJ9