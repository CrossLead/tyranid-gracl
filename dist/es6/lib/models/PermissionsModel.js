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
const tyranid_1 = require('tyranid');
const PermissionsLocks_1 = require('./PermissionsLocks');
exports.PermissionsBaseCollection = new tyranid_1.default.Collection({
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
        const plugin = tyranid_1.default.secure;
        if (!plugin) {
            throw new Error(`No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!`);
        }
        return plugin;
    }
    static validatePermissionType(permissionType, queriedCollection) {
        const [action, collectionName] = permissionType.split('-'), { validPermissionActions } = PermissionsModel;
        if (!collectionName) {
            throw new Error(`Invalid permissionType ${permissionType}! ` +
                `No collection name in permission type, permissions must be formatted as <action>-<collection>`);
        }
        const plugin = PermissionsModel.getGraclPlugin();
        if (!plugin.getPermissionObject(permissionType)) {
            throw new Error(`Invalid permissionType ${permissionType}! ` +
                `permission action given ("${action}") is not valid. Must be one of (${_.keys(plugin.permissionHierarchy).join(', ')})`);
        }
        PermissionsModel.validateAsResource(tyranid_1.default.byName[collectionName]);
        PermissionsModel.validateAsResource(queriedCollection);
        const queriedResourceHierarchy = plugin
            .graclHierarchy
            .getResource(queriedCollection.def.name)
            .getHierarchyClassNames();
        const permissionResourceHierarchy = plugin
            .graclHierarchy
            .getResource(collectionName)
            .getHierarchyClassNames();
        if (!(_.contains(permissionResourceHierarchy, queriedCollection.def.name) ||
            _.contains(queriedResourceHierarchy, collectionName))) {
            throw new Error(`Cannot set permission "${permissionType}" on collection ` +
                `"${collectionName}" as resource, as collection "${queriedCollection.def.name}" ` +
                `does not exist in the resource hierarchy of "${collectionName}"`);
        }
    }
    static validateAsResource(collection) {
        const plugin = PermissionsModel.getGraclPlugin();
        if (!collection) {
            throw new Error(`Attempted to validate undefined collection!`);
        }
        if (!plugin.graclHierarchy.resources.has(collection.def.name)) {
            throw new Error(`Attempted to set/get permission using ${collection.def.name} as resource, ` +
                `no relevant resource class found in tyranid-gracl plugin!`);
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
            const plugin = PermissionsModel.getGraclPlugin(), resourceCollectionName = resourceDocument.$model.def.name, subjectCollectionName = subjectDocument.$model.def.name, ResourceClass = plugin.graclHierarchy.getResource(resourceCollectionName), SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);
            if (!resourceDocument['permissions']) {
                yield tyranid_1.default.byName[resourceCollectionName]
                    .populate('permissionIds', resourceDocument);
            }
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
    static setPermissionAccess(resourceDocument, permissionType, access, subjectDocument = tyranid_1.default.local.user, abstract = false) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!abstract)
                PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);
            yield resource.setPermissionAccess(subject, permissionType, access);
            return resource.doc;
        });
    }
    static isAllowed(resourceDocument, permissionType, subjectDocument = tyranid_1.default.local.user, abstract = false) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!abstract)
                PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument), plugin = PermissionsModel.getGraclPlugin(), nextPermission = plugin.nextPermission(permissionType);
            const access = yield resource.isAllowed(subject, permissionType);
            if (!access && nextPermission) {
                return PermissionsModel.isAllowed(resourceDocument, nextPermission, subjectDocument, abstract);
            }
            return access;
        });
    }
    static explainPermission(resourceDocument, permissionType, subjectDocument = tyranid_1.default.local.user, abstract = false) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!abstract)
                PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);
            return yield resource.determineAccess(subject, permissionType);
        });
    }
    static lockPermissionsForResource(resourceDocument) {
        return __awaiter(this, void 0, Promise, function* () {
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
            if (lock['value'] && lock['value']['locked'] === true) {
                throw new Error(`Cannot update permissions for resource ${resourceDocument.$uid} as another update is in progress!`);
            }
        });
    }
    static unlockPermissionsForResource(resourceDocument) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!(resourceDocument && resourceDocument.$uid)) {
                throw new Error('No resource document provided!');
            }
            const lock = yield PermissionsLocks_1.PermissionLocks.findAndModify({
                query: {
                    resourceId: resourceDocument.$uid
                },
                update: {
                    $set: {
                        locked: false
                    }
                },
                new: false,
                upsert: true
            });
            if (!lock['value']) {
                throw new Error(`Attempted to unlock permissions that were not locked!`);
            }
        });
    }
    static updatePermissions(resourceDocument) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!resourceDocument) {
                throw new TypeError(`called PermissionsModel.updatePermissions() on undefined`);
            }
            PermissionsModel.validateAsResource(resourceDocument.$model);
            const permissions = _.get(resourceDocument, 'permissions', []), existingPermissions = [], newPermissions = [], updated = [], permIdField = PermissionsModel.def.primaryKey.field;
            yield PermissionsModel.lockPermissionsForResource(resourceDocument);
            const resourceCollectionName = resourceDocument.$model.def.name;
            const subjectIds = _.chain(permissions)
                .map('subjectId')
                .compact()
                .value();
            const existingSubjects = yield tyranid_1.default.byUids(subjectIds);
            const existingSubjectIdsFromPermissions = _.reduce(existingSubjects, (out, entity) => {
                out.add(entity.$uid);
                return out;
            }, new Set());
            const uniquenessCheck = new Set();
            _.chain(permissions)
                .filter(perm => {
                return (perm.subjectId && existingSubjectIdsFromPermissions.has(perm.subjectId));
            })
                .each(perm => {
                if (!perm.resourceId) {
                    throw new Error(`Tried to add permission for ${resourceDocument.$uid} without resourceId!`);
                }
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
            })
                .value();
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
            const populated = (yield tyranid_1.default.byName[resourceCollectionName]
                .populate('permissionIds', updatedResourceDocument));
            yield PermissionsModel.unlockPermissionsForResource(resourceDocument);
            return populated;
        });
    }
    static deletePermissions(doc) {
        return __awaiter(this, void 0, Promise, function* () {
            const uid = doc.$uid;
            if (!uid) {
                throw new Error('No $uid property on document!');
            }
            yield PermissionsModel.lockPermissionsForResource(doc);
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
                const parsed = tyranid_1.default.parseUid(altUid), collectionName = parsed.collection.def.name;
                if (!permissionsByCollection.has(collectionName)) {
                    permissionsByCollection.set(collectionName, []);
                }
                permissionsByCollection.get(collectionName).push(perm.$id);
            });
            for (const [collectionName, idList] of permissionsByCollection) {
                yield tyranid_1.default.byName[collectionName].update({
                    permissionIds: {
                        $in: idList
                    }
                }, {
                    $pull: {
                        permissionIds: {
                            $in: idList
                        }
                    }
                }, { multi: true });
            }
            delete doc['permissions'];
            doc['permissionIds'] = [];
            yield doc.$save();
            yield PermissionsModel.unlockPermissionsForResource(doc);
            return doc;
        });
    }
}
PermissionsModel.validPermissionActions = new Set(['view', 'edit', 'update', 'delete']);
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QiwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFHMUIsbUNBQWdDLG9CQUFvQixDQUFDLENBQUE7QUFHeEMsaUNBQXlCLEdBQUcsSUFBSSxpQkFBRyxDQUFDLFVBQVUsQ0FBQztJQUMxRCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxpQkFBaUI7SUFDdkIsTUFBTSxFQUFFLGtCQUFrQjtJQUMxQixNQUFNLEVBQUU7UUFDTixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3RCLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDeEIsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRTtRQUN6QixXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzdCLFlBQVksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDOUIsTUFBTSxFQUFFO1lBQ04sRUFBRSxFQUFFLFFBQVE7WUFDWixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1lBQ3RCLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7U0FDdEI7S0FDRjtDQUNGLENBQUMsQ0FBQztBQVFILCtCQUFnRSxpQ0FBMEI7SUFReEYsT0FBTyxjQUFjO1FBQ25CLE1BQU0sTUFBTSxHQUFpQixpQkFBRyxDQUFDLE1BQU0sQ0FBQztRQUN4QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG1GQUFtRixDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUNELE1BQU0s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