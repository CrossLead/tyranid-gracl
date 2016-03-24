"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }
        function rejected(value) {
            try {
                step(generator.throw(value));
            } catch (e) {
                reject(e);
            }
        }
        function step(result) {
            result.done ? resolve(result.value) : new P(function (resolve) {
                resolve(result.value);
            }).then(fulfilled, rejected);
        }
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
        var _permissionType$split = permissionType.split('-');

        var _permissionType$split2 = _slicedToArray(_permissionType$split, 2);

        const action = _permissionType$split2[0];
        const collectionName = _permissionType$split2[1];const validPermissionActions = PermissionsModel.validPermissionActions;

        if (!collectionName) {
            throw new Error(`Invalid permissionType ${ permissionType }! ` + `No collection name in permission type, permissions must be formatted as <action>-<collection>`);
        }
        if (!validPermissionActions.has(action)) {
            throw new Error(`Invalid permissionType ${ permissionType }! ` + `permission action given ${ action } is not valid. Must be one of ${ [].concat(_toConsumableArray(validPermissionActions)).join(', ') }`);
        }
        const plugin = PermissionsModel.getGraclPlugin();
        PermissionsModel.validateAsResource(Tyr.byName[collectionName]);
        PermissionsModel.validateAsResource(queriedCollection);
        const queriedResourceHierarchy = plugin.graclHierarchy.getResource(queriedCollection.def.name).getHierarchyClassNames();
        const permissionResourceHierarchy = plugin.graclHierarchy.getResource(collectionName).getHierarchyClassNames();
        if (!(_.contains(permissionResourceHierarchy, queriedCollection.def.name) || _.contains(queriedResourceHierarchy, collectionName))) {
            throw new Error(`Cannot set permission "${ permissionType }" on collection ` + `"${ collectionName }" as resource, as collection "${ queriedCollection.def.name }" ` + `does not exist in the resource hierarchy of "${ collectionName }"`);
        }
    }
    static validateAsResource(collection) {
        const plugin = PermissionsModel.getGraclPlugin();
        if (!collection) {
            throw new Error(`Attempted to validate undefined collection!`);
        }
        if (!plugin.graclHierarchy.resources.has(collection.def.name)) {
            throw new Error(`Attempted to set/get permission using ${ collection.def.name } as resource, ` + `no relevant resource class found in tyranid-gracl plugin!`);
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
            const resourceCollectionName = resourceDocument.$model.def.name,
                  subjectCollectionName = subjectDocument.$model.def.name;
            if (!resourceDocument['permissions']) {
                yield Tyr.byName[resourceCollectionName].populate('permissionIds', resourceDocument);
            }
            const ResourceClass = plugin.graclHierarchy.getResource(resourceCollectionName),
                  SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);
            if (!ResourceClass) {
                throw new Error(`Attempted to set/get permission using ${ resourceCollectionName } as resource, ` + `no relevant resource class found in tyranid-gracl plugin!`);
            }
            if (!SubjectClass) {
                throw new Error(`Attempted to set/get permission using ${ subjectCollectionName } as subject, ` + `no relevant subject class found in tyranid-gracl plugin!`);
            }
            const subject = new SubjectClass(subjectDocument),
                  resource = new ResourceClass(resourceDocument);
            return { subject: subject, resource: resource };
        });
    }
    static setPermissionAccess(resourceDocument, permissionType, access) {
        let subjectDocument = arguments.length <= 3 || arguments[3] === undefined ? Tyr.local.user : arguments[3];

        return __awaiter(this, void 0, Promise, function* () {
            PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);

            var _ref = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);

            const subject = _ref.subject;
            const resource = _ref.resource;

            yield resource.setPermissionAccess(subject, permissionType, access);
            return resource.doc;
        });
    }
    static isAllowed(resourceDocument, permissionType) {
        let subjectDocument = arguments.length <= 2 || arguments[2] === undefined ? Tyr.local.user : arguments[2];

        return __awaiter(this, void 0, Promise, function* () {
            PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);

            var _ref2 = yield PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);

            const subject = _ref2.subject;
            const resource = _ref2.resource;

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
                throw new Error(`Cannot update permissions for resource ${ resourceDocument.$uid } as another update is in progress!`);
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
            const permissions = _.get(resourceDocument, 'permissions', []),
                  existingPermissions = [],
                  newPermissions = [],
                  updated = [],
                  permIdField = PermissionsModel.def.primaryKey.field;
            yield PermissionsModel.lockPermissionsForResource(resourceDocument);
            const resourceCollectionName = resourceDocument.$model.def.name;
            const subjectIds = _.chain(permissions).map('subjectId').compact().value();
            const existingSubjects = yield Tyr.byUids(subjectIds, { tyranid: { insecure: true } });
            const existingSubjectIdsFromPermissions = _.reduce(existingSubjects, (out, entity) => {
                out.add(entity.$uid);
                return out;
            }, new Set());
            const uniquenessCheck = new Set();
            _.chain(permissions).filter(perm => {
                return perm.subjectId && existingSubjectIdsFromPermissions.has(perm.subjectId);
            }).each(perm => {
                if (!perm.resourceId) throw new Error(`Tried to add permission for ${ resourceDocument.$uid } without resourceId!`);
                const hash = `${ perm.resourceId }-${ perm.subjectId }`;
                if (uniquenessCheck.has(hash)) {
                    throw new Error(`Attempted to set duplicate permission for combination of ` + `resource = ${ perm.resourceId }, subject = ${ perm.subjectId }`);
                }
                uniquenessCheck.add(hash);
                if (perm[permIdField]) {
                    existingPermissions.push(perm);
                } else {
                    newPermissions.push(perm);
                }
            }).value();
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
            updated.push.apply(updated, _toConsumableArray((yield Promise.all(existingUpdatePromises))));
            updated.push.apply(updated, _toConsumableArray((yield Promise.all(newPermissionPromises))));
            resourceDocument['permissionIds'] = _.map(updated, permIdField);
            yield PermissionsModel.remove({
                [permIdField]: { $nin: resourceDocument['permissionIds'] },
                resourceId: resourceDocument.$uid
            });
            const updatedResourceDocument = yield resourceDocument.$save();
            const populated = yield Tyr.byName[resourceCollectionName].populate('permissionIds', updatedResourceDocument);
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
                $or: [{ subjectId: uid }, { resourceId: uid }]
            }, null, { tyranid: { insecure: true } });
            const permissionsByCollection = new Map();
            _.each(permissions, perm => {
                const altUid = perm['subjectId'] === uid ? perm['resourceId'] : perm['subjectId'];
                const parsed = Tyr.parseUid(altUid),
                      collectionName = parsed.collection.def.name;
                if (!permissionsByCollection.has(collectionName)) {
                    permissionsByCollection.set(collectionName, []);
                }
                permissionsByCollection.get(collectionName).push(perm.$id);
            });
            for (const _ref3 of permissionsByCollection) {
                var _ref4 = _slicedToArray(_ref3, 2);

                const collectionName = _ref4[0];
                const idList = _ref4[1];

                yield Tyr.byName[collectionName].update({}, {
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