"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const _ = require('lodash');
const Tyr = require('tyranid');
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
class PermissionsModel extends exports.PermissionsBaseCollection {
    static setPermission(resourceDocument, permissionType, access, subjectDocument = Tyr.local.user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!resourceDocument) {
                throw new Error('No resource provided to setPermission()!');
            }
            if (!subjectDocument) {
                throw new Error('No subject provided to setPermission() (or Tyr.local.user is unavailable)!');
            }
            const plugin = Tyr.secure;
            const resourceCollectionName = resourceDocument.$model.def.name, subjectCollectionName = subjectDocument.$model.def.name;
            const ResourceClass = plugin.graclHierarchy.getResource(resourceCollectionName), SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);
            if (!ResourceClass) {
                throw new Error(`Attempted to set permission using ${resourceCollectionName} as resource, ` +
                    `no relevant resource class found in tyranid-gracl plugin!`);
            }
            if (!SubjectClass) {
                throw new Error(`Attempted to set permission using ${subjectCollectionName} as subject, ` +
                    `no relevant subject class found in tyranid-gracl plugin!`);
            }
            return yield PermissionsModel.updatePermissions(resourceDocument);
        });
    }
    static updatePermissions(doc) {
        return __awaiter(this, void 0, void 0, function* () {
            const permissions = _.get(doc, 'permissions', []), existingPermissions = [], newPermissions = [], updated = [], permIdField = PermissionsModel.def.primaryKey.field;
            const uniquenessCheck = new Set();
            _.each(permissions, perm => {
                if (!perm.resourceId)
                    throw new Error(`Tried to add permission for ${doc.$uid} without resourceId!`);
                if (!perm.subjectId)
                    throw new Error(`Tried to add permission for ${doc.$uid} without subjectId!`);
                const hash = `${perm.resourceId}-${perm.subjectId}`;
                if (uniquenessCheck.has(hash)) {
                    throw new Error(`Attempted to set duplicate permission for combination of ` +
                        `resource = ${perm.resourceId}, subject = ${perm.subjectId}`);
                }
                if (perm[permIdField]) {
                    existingPermissions.push(perm);
                }
                else {
                    newPermissions.push(perm);
                }
            });
            updated.push(...(yield Promise.all(existingPermissions.map(perm => {
                return PermissionsModel.findAndModify({
                    query: { [permIdField]: perm[permIdField] },
                    update: { $set: perm },
                    new: true
                });
            }))));
            updated.push(...(yield Promise.all(newPermissions.map(perm => {
                const p = new PermissionsModel(perm);
                return p.$save();
            }))));
            delete doc['permissions'];
            doc['permissionIds'] = _.map(updated, permIdField);
            yield PermissionsModel.remove({
                [permIdField]: { $nin: doc['permissionIds'] },
                resourceId: doc.$uid
            });
            return doc.$save();
        });
    }
    ;
    static deletePermissions(uid) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
}
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUtsQixpQ0FBeUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDMUQsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsaUJBQWlCO0lBQ3ZCLE1BQU0sRUFBRSxrQkFBa0I7SUFDMUIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFO1FBQ3hCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDekIsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzlCLE1BQU0sRUFBRTtZQUNOLEVBQUUsRUFBRSxRQUFRO1lBQ1osSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUN0QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1NBQ3RCO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFRSCwrQkFBZ0UsaUNBQTBCO0lBRXhGLE9BQWEsYUFBYSxDQUN0QixnQkFBOEIsRUFDOUIsY0FBc0IsRUFDdEIsTUFBZSxFQUNmLGVBQWUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUk7O1lBR2xDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7WUFDOUQs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