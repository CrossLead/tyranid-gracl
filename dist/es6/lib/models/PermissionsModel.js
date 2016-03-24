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
    static validatePermissionType(permissionType, queriedCollection) {
        const [action, collectionName] = permissionType.split('-'), { validPermissionActions } = PermissionsModel;
        if (!collectionName) {
            throw new Error(`Invalid permissionType ${permissionType}! ` +
                `No collection name in permission type, permissions must be formatted as <action>-<collection>`);
        }
        if (!validPermissionActions.has(action)) {
            throw new Error(`Invalid permissionType ${permissionType}! ` +
                `permission action given ("${action}") is not valid. Must be one of (${[...validPermissionActions].join(', ')})`);
        }
        const plugin = PermissionsModel.getGraclPlugin();
        PermissionsModel.validateAsResource(Tyr.byName[collectionName]);
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
                yield Tyr.byName[resourceCollectionName]
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
    static setPermissionAccess(resourceDocument, permissionType, access, subjectDocument = Tyr.local.user) {
        return __awaiter(this, void 0, Promise, function* () {
            PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);
            yield resource.setPermissionAccess(subject, permissionType, access);
            return resource.doc;
        });
    }
    static isAllowed(resourceDocument, permissionType, subjectDocument = Tyr.local.user) {
        return __awaiter(this, void 0, Promise, function* () {
            PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);
            const { subject, resource } = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);
            return yield resource.isAllowed(subject, permissionType);
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
            const existingSubjects = yield Tyr.byUids(subjectIds, { tyranid: { insecure: true } });
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
            const populated = (yield Tyr.byName[resourceCollectionName]
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
                yield Tyr.byName[collectionName].update({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGVybWlzc2lvbnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9tb2RlbHMvUGVybWlzc2lvbnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFDQSxNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUcvQixtQ0FBZ0Msb0JBQW9CLENBQUMsQ0FBQTtBQUd4QyxpQ0FBeUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUM7SUFDMUQsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsaUJBQWlCO0lBQ3ZCLE1BQU0sRUFBRSxrQkFBa0I7SUFDMUIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFO1FBQ3hCLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUU7UUFDekIsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUM3QixZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQzlCLE1BQU0sRUFBRTtZQUNOLEVBQUUsRUFBRSxRQUFRO1lBQ1osSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtZQUN0QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1NBQ3RCO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFRSCwrQkFBZ0UsaUNBQTBCO0lBUXhGLE9BQU8sY0FBYztRQUNuQixNQUFNLE1BQU0sR0FBaUIsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUN4QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLG1GQUFtRixDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUNE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