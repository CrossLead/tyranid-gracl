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
        const plugin = PermissionsModel.getGraclPlugin(), components = plugin.parsePermissionString(permissionType);
        if (!plugin.getPermissionObject(permissionType)) {
            throw new Error(`Invalid permissionType ${permissionType}! ` +
                `permission action given ("${components.action}") is not valid. Must be one of (${_.keys(plugin.permissionHierarchy).join(', ')})`);
        }
        if (components.collection) {
            const permissionCollection = tyranid_1.default.byName[components.collection];
            if (!permissionCollection) {
                throw new Error(`No collection ${components.collection}, permission ` +
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
                .getResource(components.collection)
                .getHierarchyClassNames();
            if (!(_.contains(permissionResourceHierarchy, queriedCollection.def.name) ||
                _.contains(queriedResourceHierarchy, components.collection))) {
                throw new Error(`Cannot set permission "${permissionType}" on collection ` +
                    `"${components.collection}" as resource, as collection "${queriedCollection.def.name}" ` +
                    `does not exist in the resource hierarchy of "${components.collection}"`);
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
            const plugin = PermissionsModel.getGraclPlugin(), resourceCollectionName = resourceDocument.$model.def.name;
            if (!resourceDocument[plugin.populatedPermissionsProperty]) {
                yield tyranid_1.default.byName[resourceCollectionName]
                    .populate(plugin.permissionIdProperty, resourceDocument);
            }
            const subject = PermissionsModel.createSubject(subjectDocument), resource = PermissionsModel.createResource(resourceDocument);
            return { subject: subject, resource: resource };
        });
    }
    static createSubject(subjectDocument) {
        if (!(subjectDocument && subjectDocument.$uid)) {
            throw new Error('No subject document provided (or Tyr.local.user is unavailable)!');
        }
        const plugin = PermissionsModel.getGraclPlugin(), subjectCollectionName = subjectDocument.$model.def.name, SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);
        if (!SubjectClass) {
            throw new Error(`Attempted to set/get permission using ${subjectCollectionName} as subject, ` +
                `no relevant subject class found in tyranid-gracl plugin!`);
        }
        return new SubjectClass(subjectDocument);
    }
    static createResource(resourceDocument) {
        if (!(resourceDocument && resourceDocument.$uid)) {
            throw new Error('No resource document provided (or Tyr.local.user is unavailable)!');
        }
        const plugin = PermissionsModel.getGraclPlugin(), resourceCollectionName = resourceDocument.$model.def.name, ResourceClass = plugin.graclHierarchy.getResource(resourceCollectionName);
        if (!ResourceClass) {
            throw new Error(`Attempted to set/get permission using ${resourceCollectionName} as resource, ` +
                `no relevant resource class found in tyranid-gracl plugin!`);
        }
        return new ResourceClass(resourceDocument);
    }
    static getPermissionsOfTypeForResource(resourceDocument, permissionType) {
        return __awaiter(this, void 0, void 0, function* () {
            PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);
            const resource = PermissionsModel.createResource(resourceDocument);
            const query = {
                resourceId: {
                    $in: yield resource.getHierarchyIds()
                }
            };
            if (permissionType) {
                query[`access.${permissionType}`] = {
                    $exists: true
                };
            }
            return PermissionsModel.findAll(query);
        });
    }
    static getPermissionsOfTypeForSubject(subjectDocument, permissionType) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = PermissionsModel.createSubject(subjectDocument);
            const query = {
                subjectId: {
                    $in: yield subject.getHierarchyIds()
                }
            };
            if (permissionType) {
                query[`access.${permissionType}`] = {
                    $exists: true
                };
            }
            return PermissionsModel.findAll(query);
        });
    }
    static setPermissionAccess(resourceDocument, permissionType, access, subjectDocument = tyranid_1.default.local.user, abstract = false) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!abstract)
                PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);
            const plugin = PermissionsModel.getGraclPlugin();
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);
            const set = yield resource.setPermissionAccess(subject, permissionType, access);
            return set.doc;
        });
    }
    static isAllowed(resourceDocument, permissionType, subjectDocument = tyranid_1.default.local.user, abstract = false) {
        return __awaiter(this, void 0, Promise, function* () {
            if (!abstract)
                PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);
            const plugin = PermissionsModel.getGraclPlugin();
            if (!resourceDocument[plugin.populatedPermissionsProperty]) {
                resourceDocument = yield resourceDocument.$populate(plugin.permissionIdProperty);
            }
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument), components = plugin.parsePermissionString(permissionType), nextPermissions = plugin.nextPermissions(permissionType), access = yield resource.isAllowed(subject, permissionType);
            if (!access && nextPermissions) {
                for (const nextPermission of nextPermissions) {
                    const parentAccess = yield PermissionsModel
                        .isAllowed(resourceDocument, nextPermission, subjectDocument, abstract);
                    if (parentAccess)
                        return true;
                }
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
            if (!resourceDocument.$uid) {
                throw new TypeError(`resource document must be a Tyranid document with $uid`);
            }
            PermissionsModel.validateAsResource(resourceDocument.$model);
            const plugin = PermissionsModel.getGraclPlugin();
            const permissions = _.get(resourceDocument, plugin.populatedPermissionsProperty, []), existingPermissions = [], newPermissions = [], updated = [], permIdField = PermissionsModel.def.primaryKey.field;
            delete resourceDocument[plugin.populatedPermissionsProperty];
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
                .compact()
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
            const existingUpdates = yield Promise.all(existingPermissions.map((perm) => __awaiter(this, void 0, void 0, function* () {
                const update = yield PermissionsModel.findAndModify({
                    query: {
                        [permIdField]: perm[permIdField]
                    },
                    update: { $set: perm },
                    new: true
                });
                return update['value'];
            })));
            const newPermissionInserts = yield Promise.all(newPermissions.map(perm => {
                return PermissionsModel.fromClient(perm).$insert();
            }));
            updated.push(...existingUpdates);
            updated.push(...newPermissionInserts);
            const updatedIds = resourceDocument[plugin.permissionIdProperty] = _.chain(updated)
                .compact()
                .map(permIdField)
                .value();
            const removeQuery = {
                [permIdField]: { $nin: updatedIds },
                resourceId: resourceDocument.$uid
            };
            yield PermissionsModel.remove(removeQuery);
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
            if (!uid)
                throw new Error('No $uid property on document!');
            yield PermissionsModel.lockPermissionsForResource(doc);
            const permissions = yield PermissionsModel.findAll({
                $or: [
                    { subjectId: uid },
                    { resourceId: uid }
                ]
            }), permissionsByCollection = new Map(), plugin = PermissionsModel.getGraclPlugin();
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
            delete doc[plugin.populatedPermissionsProperty];
            doc[plugin.permissionIdProperty] = [];
            yield doc.$save();
            yield PermissionsModel.unlockPermissionsForResource(doc);
            return doc;
        });
    }
}
exports.PermissionsModel = PermissionsModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QiwwQkFBZ0IsU0FBUyxDQUFDLENBQUE7QUFHMUIsbUNBQWdDLG9CQUFvQixDQUFDLENBQUE7QUFHeEMsaUNBQXlCLEdBQUcsSUFBSSxpQkFBRyxDQUFDLFVBQVUsQ0FBQztJQUMxRCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxpQkFBaUI7SUFDdkIsTUFBTSxFQUFFLGtCQUFrQjtJQUMxQixNQUFNLEVBQUU7UUFDTixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3RCLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDeEIsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRTtRQUN6QixXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzdCLFlBQVksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDOUIsTUFBTSxFQUFFO1lBQ04sRUFBRSxFQUFFLFFBQVE7WUFDWixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1lBQ3RCLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7U0FDdEI7S0FDRjtDQUNGLENBQUMsQ0FBQztBQVFILCtCQUFnRSxpQ0FBMEI7SUFHeEYsT0FBTyxjQUFjO1FBQ25CLE1BQU0sTUFBTSxHQUFpQixpQkFBRyxDQUFDLE1BQU0sQ0FBQztRQUN4QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG1GQUFtRixDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUNELE1BQU0s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