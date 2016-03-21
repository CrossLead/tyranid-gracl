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
    static getGraclPlugin() {
        const plugin = Tyr.secure;
        if (!plugin) {
            throw new Error(`No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!`);
        }
        return plugin;
    }
    static validatePermissionType(permissionType) {
        const [action, collectionName] = permissionType.split('-'), { validPermissionActions } = PermissionsModel;
        if (!collectionName) {
            throw new Error(`Invalid permissionType ${permissionType}! ` +
                `No collection name in permission type, permissions must be formatted as <action>-<collection>`);
        }
        if (!validPermissionActions.has(action)) {
            throw new Error(`Invalid permissionType ${permissionType}! ` +
                `permission action given ${action} is not valid. Must be one of ${[...validPermissionActions].join(', ')}`);
        }
        const plugin = PermissionsModel.getGraclPlugin();
        if (!plugin.graclHierarchy.resources.has(collectionName)) {
            throw new Error(`Invalid permissionType ${permissionType}! ` +
                `collection given ${collectionName} is not valid as there is no associated resource class.`);
        }
    }
    static getGraclClasses(resourceDocument, subjectDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!resourceDocument) {
                throw new Error('No resource document provided!');
            }
            if (!subjectDocument) {
                throw new Error('No subject document provided (or Tyr.local.user is unavailable)!');
            }
            const plugin = PermissionsModel.getGraclPlugin();
            const resourceCollectionName = resourceDocument.$model.def.name, subjectCollectionName = subjectDocument.$model.def.name;
            if (!resourceDocument['permissions']) {
                yield Tyr.byName[resourceCollectionName].populate('permissionIds', resourceDocument);
            }
            const ResourceClass = plugin.graclHierarchy.getResource(resourceCollectionName), SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);
            if (!ResourceClass) {
                throw new Error(`Attempted to set/get permission using ${resourceCollectionName} as resource, ` +
                    `no relevant resource class found in tyranid-gracl plugin!`);
            }
            if (!SubjectClass) {
                throw new Error(`Attempted to set/get permission using ${subjectCollectionName} as subject, ` +
                    `no relevant subject class found in tyranid-gracl plugin!`);
            }
            const subject = new SubjectClass(subjectDocument), resource = new ResourceClass(resourceDocument);
            return { subject: subject, resource: resource };
        });
    }
    static setPermissionAccess(resourceDocument, permissionType, access, subjectDocument = Tyr.local.user) {
        return __awaiter(this, void 0, void 0, function* () {
            PermissionsModel.validatePermissionType(permissionType);
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);
            yield resource.setPermissionAccess(subject, permissionType, access);
            return resource.doc;
        });
    }
    static isAllowed(resourceDocument, permissionType, subjectDocument = Tyr.local.user) {
        return __awaiter(this, void 0, void 0, function* () {
            PermissionsModel.validatePermissionType(permissionType);
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);
            return yield resource.isAllowed(subject, permissionType);
        });
    }
    static updatePermissions(resourceDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            const permissions = _.get(resourceDocument, 'permissions', []), existingPermissions = [], newPermissions = [], updated = [], permIdField = PermissionsModel.def.primaryKey.field;
            const plugin = PermissionsModel.getGraclPlugin(), resourceCollectionName = resourceDocument.$model.def.name;
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
                return PermissionsModel.fromClient(perm).$save();
            });
            updated.push(...(yield Promise.all(existingUpdatePromises)));
            updated.push(...(yield Promise.all(newPermissionPromises)));
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
        return __awaiter(this, void 0, void 0, function* () {
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
PermissionsModel.validPermissionActions = new Set(['view', 'edit', 'update', 'delete']);
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUtsQixpQ0FBeUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDMUQsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsaUJBQWlCO0lBQ3ZCLE1BQU0sRUFBRSxrQkFBa0I7SUFDMUIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFO1FBQ3hCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDekIsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzlCLE1BQU0sRUFBRTtZQUNOLEVBQUUsRUFBRSxRQUFRO1lBQ1osSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUN0QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1NBQ3RCO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFRSCwrQkFBZ0UsaUNBQTBCO0lBTXhGLE9BQU8sY0FBYztRQUNuQixNQUFNLE1BQU0sR0FBaUIsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUN4QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG1GQUFtRixDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUNELE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDaEIsQ0FB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