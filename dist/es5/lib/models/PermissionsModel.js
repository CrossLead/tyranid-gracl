"use strict";

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = _promise2.default))(function (resolve, reject) {
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
var _ = require('lodash');
var Tyr = require('tyranid');
var PermissionsLocks_1 = require('./PermissionsLocks');
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

var PermissionsModel = function (_exports$PermissionsB) {
    (0, _inherits3.default)(PermissionsModel, _exports$PermissionsB);

    function PermissionsModel() {
        (0, _classCallCheck3.default)(this, PermissionsModel);
        return (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(PermissionsModel).apply(this, arguments));
    }

    (0, _createClass3.default)(PermissionsModel, null, [{
        key: 'getGraclPlugin',
        value: function getGraclPlugin() {
            var plugin = Tyr.secure;
            if (!plugin) {
                throw new Error('No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!');
            }
            return plugin;
        }
    }, {
        key: 'validatePermissionType',
        value: function validatePermissionType(permissionType) {
            var _permissionType$split = permissionType.split('-');

            var _permissionType$split2 = (0, _slicedToArray3.default)(_permissionType$split, 2);

            var action = _permissionType$split2[0];
            var collectionName = _permissionType$split2[1];var validPermissionActions = PermissionsModel.validPermissionActions;

            if (!collectionName) {
                throw new Error('Invalid permissionType ' + permissionType + '! ' + 'No collection name in permission type, permissions must be formatted as <action>-<collection>');
            }
            if (!validPermissionActions.has(action)) {
                throw new Error('Invalid permissionType ' + permissionType + '! ' + ('permission action given ' + action + ' is not valid. Must be one of ' + [].concat((0, _toConsumableArray3.default)(validPermissionActions)).join(', ')));
            }
            var plugin = PermissionsModel.getGraclPlugin();
            if (!plugin.graclHierarchy.resources.has(collectionName)) {
                throw new Error('Invalid permissionType ' + permissionType + '! ' + ('collection given ' + collectionName + ' is not valid as there is no associated resource class.'));
            }
        }
    }, {
        key: 'getGraclClasses',
        value: function getGraclClasses(resourceDocument, subjectDocument) {
            return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee() {
                var plugin, resourceCollectionName, subjectCollectionName, ResourceClass, SubjectClass, subject, resource;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (resourceDocument && resourceDocument.$uid) {
                                    _context.next = 2;
                                    break;
                                }

                                throw new Error('No resource document provided!');

                            case 2:
                                if (subjectDocument && subjectDocument.$uid) {
                                    _context.next = 4;
                                    break;
                                }

                                throw new Error('No subject document provided (or Tyr.local.user is unavailable)!');

                            case 4:
                                plugin = PermissionsModel.getGraclPlugin();
                                resourceCollectionName = resourceDocument.$model.def.name, subjectCollectionName = subjectDocument.$model.def.name;

                                if (resourceDocument['permissions']) {
                                    _context.next = 9;
                                    break;
                                }

                                _context.next = 9;
                                return Tyr.byName[resourceCollectionName].populate('permissionIds', resourceDocument);

                            case 9:
                                ResourceClass = plugin.graclHierarchy.getResource(resourceCollectionName), SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);

                                if (ResourceClass) {
                                    _context.next = 12;
                                    break;
                                }

                                throw new Error('Attempted to set/get permission using ' + resourceCollectionName + ' as resource, ' + 'no relevant resource class found in tyranid-gracl plugin!');

                            case 12:
                                if (SubjectClass) {
                                    _context.next = 14;
                                    break;
                                }

                                throw new Error('Attempted to set/get permission using ' + subjectCollectionName + ' as subject, ' + 'no relevant subject class found in tyranid-gracl plugin!');

                            case 14:
                                subject = new SubjectClass(subjectDocument), resource = new ResourceClass(resourceDocument);
                                return _context.abrupt('return', { subject: subject, resource: resource });

                            case 16:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));
        }
    }, {
        key: 'setPermissionAccess',
        value: function setPermissionAccess(resourceDocument, permissionType, access) {
            var subjectDocument = arguments.length <= 3 || arguments[3] === undefined ? Tyr.local.user : arguments[3];

            return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee2() {
                var _ref, subject, resource;

                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                PermissionsModel.validatePermissionType(permissionType);
                                _context2.next = 3;
                                return PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);

                            case 3:
                                _ref = _context2.sent;
                                subject = _ref.subject;
                                resource = _ref.resource;
                                _context2.next = 8;
                                return resource.setPermissionAccess(subject, permissionType, access);

                            case 8:
                                return _context2.abrupt('return', resource.doc);

                            case 9:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));
        }
    }, {
        key: 'isAllowed',
        value: function isAllowed(resourceDocument, permissionType) {
            var subjectDocument = arguments.length <= 2 || arguments[2] === undefined ? Tyr.local.user : arguments[2];

            return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee3() {
                var _ref2, subject, resource;

                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                PermissionsModel.validatePermissionType(permissionType);
                                _context3.next = 3;
                                return PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);

                            case 3:
                                _ref2 = _context3.sent;
                                subject = _ref2.subject;
                                resource = _ref2.resource;
                                _context3.next = 8;
                                return resource.isAllowed(subject, permissionType);

                            case 8:
                                return _context3.abrupt('return', _context3.sent);

                            case 9:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));
        }
    }, {
        key: 'updatePermissions',
        value: function updatePermissions(resourceDocument) {
            return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee4() {
                var _PermissionsModel$rem;

                var permissions, existingPermissions, newPermissions, updated, permIdField, lock, plugin, resourceCollectionName, uniquenessCheck, existingUpdatePromises, newPermissionPromises, updatedResourceDocument, populated;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                permissions = _.get(resourceDocument, 'permissions', []), existingPermissions = [], newPermissions = [], updated = [], permIdField = PermissionsModel.def.primaryKey.field;

                                if (resourceDocument && resourceDocument.$uid) {
                                    _context4.next = 3;
                                    break;
                                }

                                throw new Error('No resource document provided!');

                            case 3:
                                _context4.next = 5;
                                return PermissionsLocks_1.PermissionLocks.findAndModify({
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

                            case 5:
                                lock = _context4.sent;

                                if (!(lock && lock['locked'] === true)) {
                                    _context4.next = 8;
                                    break;
                                }

                                throw new Error('Cannot update permissions for resource ' + resourceDocument.$uid + ' as another update is in progress!');

                            case 8:
                                plugin = PermissionsModel.getGraclPlugin(), resourceCollectionName = resourceDocument.$model.def.name;

                                if (plugin.graclHierarchy.resources.has(resourceCollectionName)) {
                                    _context4.next = 11;
                                    break;
                                }

                                throw new Error('Attempted to update permissions for document in ' + resourceCollectionName + ' collection as resource ' + 'but no resource class for that collection was found!');

                            case 11:
                                uniquenessCheck = new _set2.default();

                                _.each(permissions, function (perm) {
                                    if (!perm.resourceId) throw new Error('Tried to add permission for ' + resourceDocument.$uid + ' without resourceId!');
                                    if (!perm.subjectId) throw new Error('Tried to add permission for ' + resourceDocument.$uid + ' without subjectId!');
                                    var hash = perm.resourceId + '-' + perm.subjectId;
                                    if (uniquenessCheck.has(hash)) {
                                        throw new Error('Attempted to set duplicate permission for combination of ' + ('resource = ' + perm.resourceId + ', subject = ' + perm.subjectId));
                                    }
                                    uniquenessCheck.add(hash);
                                    if (perm[permIdField]) {
                                        existingPermissions.push(perm);
                                    } else {
                                        newPermissions.push(perm);
                                    }
                                });
                                existingUpdatePromises = existingPermissions.map(function (perm) {
                                    return PermissionsModel.findAndModify({
                                        query: (0, _defineProperty3.default)({}, permIdField, perm[permIdField]),
                                        update: { $set: perm },
                                        new: true
                                    });
                                });
                                newPermissionPromises = newPermissions.map(function (perm) {
                                    return PermissionsModel.fromClient(perm).$save();
                                });
                                _context4.t0 = updated.push;
                                _context4.t1 = updated;
                                _context4.next = 19;
                                return _promise2.default.all(existingUpdatePromises);

                            case 19:
                                _context4.t2 = _context4.sent;
                                _context4.t3 = (0, _toConsumableArray3.default)(_context4.t2);

                                _context4.t0.apply.call(_context4.t0, _context4.t1, _context4.t3);

                                _context4.t4 = updated.push;
                                _context4.t5 = updated;
                                _context4.next = 26;
                                return _promise2.default.all(newPermissionPromises);

                            case 26:
                                _context4.t6 = _context4.sent;
                                _context4.t7 = (0, _toConsumableArray3.default)(_context4.t6);

                                _context4.t4.apply.call(_context4.t4, _context4.t5, _context4.t7);

                                resourceDocument['permissionIds'] = _.map(updated, permIdField);
                                _context4.next = 32;
                                return PermissionsModel.remove((_PermissionsModel$rem = {}, (0, _defineProperty3.default)(_PermissionsModel$rem, permIdField, { $nin: resourceDocument['permissionIds'] }), (0, _defineProperty3.default)(_PermissionsModel$rem, 'resourceId', resourceDocument.$uid), _PermissionsModel$rem));

                            case 32:
                                _context4.next = 34;
                                return resourceDocument.$save();

                            case 34:
                                updatedResourceDocument = _context4.sent;
                                _context4.next = 37;
                                return Tyr.byName[resourceCollectionName].populate('permissionIds', updatedResourceDocument);

                            case 37:
                                populated = _context4.sent;
                                _context4.next = 40;
                                return PermissionsLocks_1.PermissionLocks.findAndModify({
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

                            case 40:
                                return _context4.abrupt('return', populated);

                            case 41:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));
        }
    }, {
        key: 'deletePermissions',
        value: function deletePermissions(doc) {
            return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee5() {
                var uid, permissions, permissionsByCollection, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, _step$value, collectionName, idList;

                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                uid = doc.$uid;

                                if (uid) {
                                    _context5.next = 3;
                                    break;
                                }

                                throw new Error('No $uid property on document!');

                            case 3:
                                _context5.next = 5;
                                return PermissionsModel.find({
                                    $or: [{ subjectId: uid }, { resourceId: uid }]
                                }, null, { tyranid: { insecure: true } });

                            case 5:
                                permissions = _context5.sent;
                                permissionsByCollection = new _map2.default();

                                _.each(permissions, function (perm) {
                                    var altUid = perm['subjectId'] === uid ? perm['resourceId'] : perm['subjectId'];
                                    var parsed = Tyr.parseUid(altUid),
                                        collectionName = parsed.collection.def.name;
                                    if (!permissionsByCollection.has(collectionName)) {
                                        permissionsByCollection.set(collectionName, []);
                                    }
                                    permissionsByCollection.get(collectionName).push(perm.$id);
                                });
                                _iteratorNormalCompletion = true;
                                _didIteratorError = false;
                                _iteratorError = undefined;
                                _context5.prev = 11;
                                _iterator = (0, _getIterator3.default)(permissionsByCollection);

                            case 13:
                                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                                    _context5.next = 22;
                                    break;
                                }

                                _step$value = (0, _slicedToArray3.default)(_step.value, 2);
                                collectionName = _step$value[0];
                                idList = _step$value[1];
                                _context5.next = 19;
                                return Tyr.byName[collectionName].update({}, {
                                    $pull: (0, _defineProperty3.default)({}, PermissionsModel.def.primaryKey.field, {
                                        $in: idList
                                    })
                                }, { multi: true });

                            case 19:
                                _iteratorNormalCompletion = true;
                                _context5.next = 13;
                                break;

                            case 22:
                                _context5.next = 28;
                                break;

                            case 24:
                                _context5.prev = 24;
                                _context5.t0 = _context5['catch'](11);
                                _didIteratorError = true;
                                _iteratorError = _context5.t0;

                            case 28:
                                _context5.prev = 28;
                                _context5.prev = 29;

                                if (!_iteratorNormalCompletion && _iterator.return) {
                                    _iterator.return();
                                }

                            case 31:
                                _context5.prev = 31;

                                if (!_didIteratorError) {
                                    _context5.next = 34;
                                    break;
                                }

                                throw _iteratorError;

                            case 34:
                                return _context5.finish(31);

                            case 35:
                                return _context5.finish(28);

                            case 36:
                                delete doc['permissions'];
                                doc['permissionIds'] = [];
                                _context5.next = 40;
                                return doc.$save();

                            case 40:
                                return _context5.abrupt('return', doc);

                            case 41:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this, [[11, 24, 28, 36], [29,, 31, 35]]);
            }));
        }
    }]);
    return PermissionsModel;
}(exports.PermissionsBaseCollection);

PermissionsModel.validPermissionActions = new _set2.default(['view', 'edit', 'update', 'delete']);
exports.PermissionsModel = PermissionsModel;