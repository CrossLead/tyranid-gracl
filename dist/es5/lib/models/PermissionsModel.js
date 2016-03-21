"use strict";

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

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

var PermissionsModel = function (_exports$PermissionsB) {
    (0, _inherits3.default)(PermissionsModel, _exports$PermissionsB);

    function PermissionsModel() {
        (0, _classCallCheck3.default)(this, PermissionsModel);
        return (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(PermissionsModel).apply(this, arguments));
    }

    (0, _createClass3.default)(PermissionsModel, null, [{
        key: 'setPermissionAccess',
        value: function setPermissionAccess(resourceDocument, permissionType, access) {
            var subjectDocument = arguments.length <= 3 || arguments[3] === undefined ? Tyr.local.user : arguments[3];

            return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee() {
                var plugin, resourceCollectionName, subjectCollectionName, ResourceClass, SubjectClass, subject, resource;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (resourceDocument) {
                                    _context.next = 2;
                                    break;
                                }

                                throw new Error('No resource provided to setPermission()!');

                            case 2:
                                if (subjectDocument) {
                                    _context.next = 4;
                                    break;
                                }

                                throw new Error('No subject provided to setPermission() (or Tyr.local.user is unavailable)!');

                            case 4:
                                plugin = Tyr.secure;
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

                                throw new Error('Attempted to set permission using ' + resourceCollectionName + ' as resource, ' + 'no relevant resource class found in tyranid-gracl plugin!');

                            case 12:
                                if (SubjectClass) {
                                    _context.next = 14;
                                    break;
                                }

                                throw new Error('Attempted to set permission using ' + subjectCollectionName + ' as subject, ' + 'no relevant subject class found in tyranid-gracl plugin!');

                            case 14:
                                subject = new SubjectClass(subjectDocument), resource = new ResourceClass(resourceDocument);
                                _context.next = 17;
                                return resource.setPermissionAccess(subject, permissionType, access);

                            case 17:
                                return _context.abrupt('return', resource.doc);

                            case 18:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));
        }
    }, {
        key: 'updatePermissions',
        value: function updatePermissions(resourceDocument) {
            return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee2() {
                var _PermissionsModel$rem;

                var permissions, existingPermissions, newPermissions, updated, permIdField, plugin, resourceCollectionName, uniquenessCheck, existingUpdatePromises, newPermissionPromises, updatedExisting, updatedNew, updatedResourceDocument;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                permissions = _.get(resourceDocument, 'permissions', []), existingPermissions = [], newPermissions = [], updated = [], permIdField = PermissionsModel.def.primaryKey.field;
                                plugin = Tyr.secure, resourceCollectionName = resourceDocument.$model.def.name;

                                if (plugin.graclHierarchy.resources.has(resourceCollectionName)) {
                                    _context2.next = 4;
                                    break;
                                }

                                throw new Error('Attempted to update permissions for document in ' + resourceCollectionName + ' collection as resource ' + 'but no resource class for that collection was found!');

                            case 4:
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
                                    var p = PermissionsModel.fromClient(perm);
                                    return p.$save();
                                });
                                _context2.next = 10;
                                return _promise2.default.all(existingUpdatePromises);

                            case 10:
                                updatedExisting = _context2.sent;
                                _context2.next = 13;
                                return _promise2.default.all(newPermissionPromises);

                            case 13:
                                updatedNew = _context2.sent;

                                updated.push.apply(updated, (0, _toConsumableArray3.default)(updatedExisting));
                                updated.push.apply(updated, (0, _toConsumableArray3.default)(updatedNew));
                                resourceDocument['permissionIds'] = _.map(updated, permIdField);
                                _context2.next = 19;
                                return PermissionsModel.remove((_PermissionsModel$rem = {}, (0, _defineProperty3.default)(_PermissionsModel$rem, permIdField, { $nin: resourceDocument['permissionIds'] }), (0, _defineProperty3.default)(_PermissionsModel$rem, 'resourceId', resourceDocument.$uid), _PermissionsModel$rem));

                            case 19:
                                _context2.next = 21;
                                return resourceDocument.$save();

                            case 21:
                                updatedResourceDocument = _context2.sent;
                                _context2.next = 24;
                                return Tyr.byName[resourceCollectionName].populate('permissionIds', updatedResourceDocument);

                            case 24:
                                return _context2.abrupt('return', _context2.sent);

                            case 25:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));
        }
    }, {
        key: 'deletePermissions',
        value: function deletePermissions(doc) {
            return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee3() {
                var uid, permissions, permissionsByCollection, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, _step$value, collectionName, idList;

                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                uid = doc.$uid;

                                if (uid) {
                                    _context3.next = 3;
                                    break;
                                }

                                throw new Error('No $uid property on document!');

                            case 3:
                                _context3.next = 5;
                                return PermissionsModel.find({
                                    $or: [{ subjectId: uid }, { resourceId: uid }]
                                });

                            case 5:
                                permissions = _context3.sent;
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
                                _context3.prev = 11;
                                _iterator = (0, _getIterator3.default)(permissionsByCollection);

                            case 13:
                                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                                    _context3.next = 22;
                                    break;
                                }

                                _step$value = (0, _slicedToArray3.default)(_step.value, 2);
                                collectionName = _step$value[0];
                                idList = _step$value[1];
                                _context3.next = 19;
                                return Tyr.byName[collectionName].update({}, {
                                    $pull: (0, _defineProperty3.default)({}, PermissionsModel.def.primaryKey.field, {
                                        $in: idList
                                    })
                                }, { multi: true });

                            case 19:
                                _iteratorNormalCompletion = true;
                                _context3.next = 13;
                                break;

                            case 22:
                                _context3.next = 28;
                                break;

                            case 24:
                                _context3.prev = 24;
                                _context3.t0 = _context3['catch'](11);
                                _didIteratorError = true;
                                _iteratorError = _context3.t0;

                            case 28:
                                _context3.prev = 28;
                                _context3.prev = 29;

                                if (!_iteratorNormalCompletion && _iterator.return) {
                                    _iterator.return();
                                }

                            case 31:
                                _context3.prev = 31;

                                if (!_didIteratorError) {
                                    _context3.next = 34;
                                    break;
                                }

                                throw _iteratorError;

                            case 34:
                                return _context3.finish(31);

                            case 35:
                                return _context3.finish(28);

                            case 36:
                                delete doc['permissions'];
                                doc['permissionIds'] = [];
                                return _context3.abrupt('return', doc.$save());

                            case 39:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this, [[11, 24, 28, 36], [29,, 31, 35]]);
            }));
        }
    }]);
    return PermissionsModel;
}(exports.PermissionsBaseCollection);

exports.PermissionsModel = PermissionsModel;