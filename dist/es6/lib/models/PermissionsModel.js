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
        const [action, collectionName] = permissionType.split('-');
        const plugin = PermissionsModel.getGraclPlugin();
        if (!plugin.getPermissionObject(permissionType)) {
            throw new Error(`Invalid permissionType ${permissionType}! ` +
                `permission action given ("${action}") is not valid. Must be one of (${_.keys(plugin.permissionHierarchy).join(', ')})`);
        }
        if (collectionName) {
            const permissionCollection = tyranid_1.default.byName[collectionName];
            if (!permissionCollection) {
                throw new Error(`No collection ${collectionName}, permission ` +
                    `of type <action>-<collection> must contain valid collection!`);
            }
            PermissionsModel.validateAsResource(permissionCollection);
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
            if (!resourceDocument[plugin.permissionProperty]) {
                yield tyranid_1.default.byName[resourceCollectionName]
                    .populate(plugin.permissionIdProperty, resourceDocument);
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
            const plugin = PermissionsModel.getGraclPlugin();
            const permissions = _.get(resourceDocument, plugin.permissionProperty, []), existingPermissions = [], newPermissions = [], updated = [], permIdField = PermissionsModel.def.primaryKey.field;
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
            resourceDocument[plugin.permissionIdProperty] = _.map(updated, permIdField);
            yield PermissionsModel.remove({
                [permIdField]: { $nin: resourceDocument[plugin.permissionIdProperty] },
                resourceId: resourceDocument.$uid
            });
            const updatedResourceDocument = yield resourceDocument.$save();
            const populated = (yield tyranid_1.default.byName[resourceCollectionName]
                .populate(plugin.permissionIdProperty, updatedResourceDocument));
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
            const plugin = PermissionsModel.getGraclPlugin();
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
                    [plugin.permissionIdProperty]: {
                        $in: idList
                    }
                }, {
                    $pull: {
                        [plugin.permissionIdProperty]: {
                            $in: idList
                        }
                    }
                }, { multi: true });
            }
            delete doc[plugin.permissionProperty];
            doc[plugin.permissionIdProperty] = [];
            yield doc.$save();
            yield PermissionsModel.unlockPermissionsForResource(doc);
            return doc;
        });
    }
}
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QiwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFHMUIsbUNBQWdDLG9CQUFvQixDQUFDLENBQUE7QUFHeEMsaUNBQXlCLEdBQUcsSUFBSSxpQkFBRyxDQUFDLFVBQVUsQ0FBQztJQUMxRCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxpQkFBaUI7SUFDdkIsTUFBTSxFQUFFLGtCQUFrQjtJQUMxQixNQUFNLEVBQUU7UUFDTixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3RCLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDeEIsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRTtRQUN6QixXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzdCLFlBQVksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDOUIsTUFBTSxFQUFFO1lBQ04sRUFBRSxFQUFFLFFBQVE7WUFDWixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1lBQ3RCLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7U0FDdEI7S0FDRjtDQUNGLENBQUMsQ0FBQztBQVFILCtCQUFnRSxpQ0FBMEI7SUFHeEYsT0FBTyxjQUFjO1FBQ25CLE1BQU0sTUFBTSxHQUFpQixpQkFBRyxDQUFDLE1BQU0sQ0FBQztRQUN4QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG1GQUFtRixDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUNELE1BQU0s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