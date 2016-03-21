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