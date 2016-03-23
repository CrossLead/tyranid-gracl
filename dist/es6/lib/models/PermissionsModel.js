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
const PermissionsLocks_1 = require('./PermissionsLocks');
exports.PermissionsBaseCollection = new Tyr.Collection({
    id: '_gp',
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
        return __awaiter(this, void 0, Promise, function* () {
            if (!(resourceDocument && resourceDocument.$uid)) {
                throw new Error('No resource document provided!');
            }
            if (!(subjectDocument && subjectDocument.$uid)) {
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
        return __awaiter(this, void 0, Promise, function* () {
            PermissionsModel.validatePermissionType(permissionType);
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);
            yield resource.setPermissionAccess(subject, permissionType, access);
            return resource.doc;
        });
    }
    static isAllowed(resourceDocument, permissionType, subjectDocument = Tyr.local.user) {
        return __awaiter(this, void 0, Promise, function* () {
            PermissionsModel.validatePermissionType(permissionType);
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);
            return yield resource.isAllowed(subject, permissionType);
        });
    }
    static updatePermissions(resourceDocument) {
        return __awaiter(this, void 0, Promise, function* () {
            const permissions = _.get(resourceDocument, 'permissions', []), existingPermissions = [], newPermissions = [], updated = [], permIdField = PermissionsModel.def.primaryKey.field;
            if (!(resourceDocument && resourceDocument.$uid)) {
                throw new Error('No resource document provided!');
            }
            const lock = yield PermissionsLocks_1.PermissionLocks.findAndModify({
                query: {
                    resourceId: resourceDocument.$uid
                },
                update: {
                    $set: {
                        locked: true
                    }
                },
                new: false,
                upsert: true
            });
            if (lock && lock['locked'] === true) {
                throw new Error(`Cannot update permissions for resource ${resourceDocument.$uid} as another update is in progress!`);
            }
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
            const populated = (yield Tyr.byName[resourceCollectionName]
                .populate('permissionIds', updatedResourceDocument));
            yield PermissionsLocks_1.PermissionLocks.findAndModify({
                query: {
                    resourceId: resourceDocument.$uid
                },
                update: {
                    $set: {
                        locked: false
                    }
                },
                upsert: true
            });
            return populated;
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
            }, null, { tyranid: { insecure: true } });
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
            yield doc.$save();
            return doc;
        });
    }
}
PermissionsModel.validPermissionActions = new Set(['view', 'edit', 'update', 'delete']);
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUcvQixtQ0FBZ0Msb0JBQW9CLENBQUMsQ0FBQTtBQUV4QyxpQ0FBeUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDMUQsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsaUJBQWlCO0lBQ3ZCLE1BQU0sRUFBRSxrQkFBa0I7SUFDMUIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFO1FBQ3hCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDekIsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzlCLE1BQU0sRUFBRTtZQUNOLEVBQUUsRUFBRSxRQUFRO1lBQ1osSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUN0QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1NBQ3RCO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFRSCwrQkFBZ0UsaUNBQTBCO0lBTXhGLE9BQU8sY0FBYztRQUNuQixNQUFNLE1BQU0sR0FBaUIsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUN4QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG1GQUFtRixDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUNE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