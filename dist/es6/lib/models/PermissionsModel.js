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
    static setPermissionAccess(resourceDocument, permissionType, access, subjectDocument = Tyr.local.user) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!resourceDocument) {
                throw new Error('No resource provided to setPermission()!');
            }
            if (!subjectDocument) {
                throw new Error('No subject provided to setPermission() (or Tyr.local.user is unavailable)!');
            }
            const plugin = Tyr.secure;
            const resourceCollectionName = resourceDocument.$model.def.name, subjectCollectionName = subjectDocument.$model.def.name;
            if (!resourceDocument['permissions']) {
                yield Tyr.byName[resourceCollectionName].populate('permissionIds', resourceDocument);
            }
            const ResourceClass = plugin.graclHierarchy.getResource(resourceCollectionName), SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);
            if (!ResourceClass) {
                throw new Error(`Attempted to set permission using ${resourceCollectionName} as resource, ` +
                    `no relevant resource class found in tyranid-gracl plugin!`);
            }
            if (!SubjectClass) {
                throw new Error(`Attempted to set permission using ${subjectCollectionName} as subject, ` +
                    `no relevant subject class found in tyranid-gracl plugin!`);
            }
            const subject = new SubjectClass(subjectDocument), resource = new ResourceClass(resourceDocument);
            yield resource.setPermissionAccess(subject, permissionType, access);
            return resource.doc;
        });
    }
    static updatePermissions(resourceDocument) {
        return __awaiter(this, void 0, Promise, function* () {
            const permissions = _.get(resourceDocument, 'permissions', []), existingPermissions = [], newPermissions = [], updated = [], permIdField = PermissionsModel.def.primaryKey.field;
            const plugin = Tyr.secure, resourceCollectionName = resourceDocument.$model.def.name;
            if (!plugin.graclHierarchy.resources.has(resourceCollectionName)) {
                throw new Error(`Attempted to update permissions for document in ${resourceCollectionName} collection as resource ` +
                    `but no resource class for that collection was found!`);
            }
            const uniquenessCheck = new Set();
            _.each(permissions, perm => {
                if (!perm.resourceId)
                    throw new Error(`Tried to add permission for ${resourceDocument.$uid} without resourceId!`);
                if (!perm.subjectId)
                    throw new Error(`Tried to add permission for ${resourceDocument.$uid} without subjectId!`);
                const hash = `${perm.resourceId}-${perm.subjectId}`;
                if (uniquenessCheck.has(hash)) {
                    throw new Error(`Attempted to set duplicate permission for combination of ` +
                        `resource = ${perm.resourceId}, subject = ${perm.subjectId}`);
                }
                uniquenessCheck.add(hash);
                if (perm[permIdField]) {
                    existingPermissions.push(perm);
                }
                else {
                    newPermissions.push(perm);
                }
            });
            const existingUpdatePromises = existingPermissions.map(perm => {
                return PermissionsModel.findAndModify({
                    query: { [permIdField]: perm[permIdField] },
                    update: { $set: perm },
                    new: true
                });
            });
            const newPermissionPromises = newPermissions.map(perm => {
                const p = PermissionsModel.fromClient(perm);
                return p.$save();
            });
            const updatedExisting = (yield Promise.all(existingUpdatePromises));
            const updatedNew = (yield Promise.all(newPermissionPromises));
            updated.push(...updatedExisting);
            updated.push(...updatedNew);
            resourceDocument['permissionIds'] = _.map(updated, permIdField);
            yield PermissionsModel.remove({
                [permIdField]: { $nin: resourceDocument['permissionIds'] },
                resourceId: resourceDocument.$uid
            });
            const updatedResourceDocument = yield resourceDocument.$save();
            return (yield Tyr.byName[resourceCollectionName]
                .populate('permissionIds', updatedResourceDocument));
        });
    }
    static deletePermissions(doc) {
        return __awaiter(this, void 0, Promise, function* () {
            const uid = doc.$uid;
            if (!uid) {
                throw new Error('No $uid property on document!');
            }
            const permissions = yield PermissionsModel.find({
                $or: [
                    { subjectId: uid },
                    { resourceId: uid }
                ]
            });
            const permissionsByCollection = new Map();
            _.each(permissions, perm => {
                const altUid = perm['subjectId'] === uid
                    ? perm['resourceId']
                    : perm['subjectId'];
                const parsed = Tyr.parseUid(altUid), collectionName = parsed.collection.def.name;
                if (!permissionsByCollection.has(collectionName)) {
                    permissionsByCollection.set(collectionName, []);
                }
                permissionsByCollection.get(collectionName).push(perm.$id);
            });
            for (const [collectionName, idList] of permissionsByCollection) {
                yield Tyr.byName[collectionName].update({}, {
                    $pull: {
                        [PermissionsModel.def.primaryKey.field]: {
                            $in: idList
                        }
                    }
                }, { multi: true });
            }
            delete doc['permissions'];
            doc['permissionIds'] = [];
            return doc.$save();
        });
    }
}
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUtsQixpQ0FBeUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDMUQsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsaUJBQWlCO0lBQ3ZCLE1BQU0sRUFBRSxrQkFBa0I7SUFDMUIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFO1FBQ3hCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDekIsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzlCLE1BQU0sRUFBRTtZQUNOLEVBQUUsRUFBRSxRQUFRO1lBQ1osSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUN0QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1NBQ3RCO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFRSCwrQkFBZ0UsaUNBQTBCO0lBR3hGLE9BQWEsbUJBQW1CLENBQzVCLGdCQUE4QixFQUM5QixjQUFzQixFQUN0QixNQUFlLEVBQ2YsZUFBZSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSTs7WUFHbEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQztZQUM5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