"use strict";

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

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
var Tyr = require('tyranid');
var PermissionsModel_1 = require('../models/PermissionsModel');
var gracl = require('gracl');
var _ = require('lodash');
var util_1 = require('../util');

var GraclPlugin = function () {
    function GraclPlugin() {
        var verbose = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];
        (0, _classCallCheck3.default)(this, GraclPlugin);

        this.verbose = verbose;
    }

    (0, _createClass3.default)(GraclPlugin, [{
        key: 'log',
        value: function log(message) {
            if (this.verbose) {
                console.log('tyranid-gracl: ' + message);
            }
            return this;
        }
    }, {
        key: 'getObjectHierarchy',
        value: function getObjectHierarchy() {
            var hierarchy = {
                subjects: {},
                resources: {}
            };
            var build = function build(obj) {
                return function (node) {
                    var path = node.getHierarchyClassNames().reverse();
                    var o = obj;
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        for (var _iterator = (0, _getIterator3.default)(path), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            var name = _step.value;

                            o = o[name] = o[name] || {};
                        }
                    } catch (err) {
                        _didIteratorError = true;
                        _iteratorError = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion && _iterator.return) {
                                _iterator.return();
                            }
                        } finally {
                            if (_didIteratorError) {
                                throw _iteratorError;
                            }
                        }
                    }
                };
            };
            this.graclHierarchy.subjects.forEach(build(hierarchy.subjects));
            this.graclHierarchy.resources.forEach(build(hierarchy.resources));
            return hierarchy;
        }
    }, {
        key: 'getShortestPath',
        value: function getShortestPath(colA, colB) {
            var a = colA.def.name,
                b = colB.def.name,
                originalEdge = a + '.' + b,
                next = this.outgoingLinkPaths;
            if (!_.get(next, originalEdge)) return [];
            var path = [a];
            while (a !== b) {
                a = _.get(next, a + '.' + b);
                if (!a) return [];
                path.push(a);
            }
            return path;
        }
    }, {
        key: 'boot',
        value: function boot(stage) {
            var _this = this;

            if (stage === 'post-link') {
                (function () {
                    _this.log('starting boot.');
                    (0, _assign2.default)(Tyr.documentPrototype, {
                        $setPermissionAccess: function $setPermissionAccess(permissionType, access) {
                            var subjectDocument = arguments.length <= 2 || arguments[2] === undefined ? Tyr.local.user : arguments[2];

                            var doc = this;
                            return PermissionsModel_1.PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
                        },
                        $isAllowed: function $isAllowed(permissionType) {
                            var subjectDocument = arguments.length <= 1 || arguments[1] === undefined ? Tyr.local.user : arguments[1];

                            var doc = this;
                            return PermissionsModel_1.PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
                        }
                    });
                    var collections = Tyr.collections,
                        nodeSet = new _set2.default();
                    var schemaObjects = {
                        subjects: {
                            links: [],
                            parents: []
                        },
                        resources: {
                            links: [],
                            parents: []
                        }
                    };
                    collections.forEach(function (col) {
                        var linkFields = col.links({ relate: 'ownedBy', direction: 'outgoing' }),
                            collectionName = col.def.name;
                        if (!linkFields.length) return;
                        if (linkFields.length > 1) {
                            throw new Error('tyranid-gracl permissions hierarchy does not allow for multiple inheritance. ' + ('Collection ' + collectionName + ' has multiple fields with outgoing ownedBy relations.'));
                        }

                        var _linkFields = (0, _slicedToArray3.default)(linkFields, 1);

                        var field = _linkFields[0];var graclType = field.def.graclType;

                        if (!graclType) return;
                        var allOutgoingFields = col.links({ direction: 'outgoing' });
                        var validateField = function validateField(f) {
                            return f.def.link === 'graclPermission' && f.name === 'permissionIds';
                        };
                        if (!_.find(allOutgoingFields, validateField)) {
                            throw new Error('Tyranid collection "' + col.def.name + '" has "graclType" annotation but no "permissionIds" field. ' + 'tyranid-gracl requires a field on secured collections of type: \n' + '"permissionIds: { is: \'array\', link: \'graclPermission\' }"');
                        }
                        switch (graclType) {
                            case 'subject':
                                schemaObjects.subjects.links.push(field);
                                schemaObjects.subjects.parents.push(field.link);
                                break;
                            case 'resource':
                                schemaObjects.resources.links.push(field);
                                schemaObjects.resources.parents.push(field.link);
                                break;
                            default:
                                throw new Error('Invalid gracl node type set on collection ' + collectionName + ', type = ' + graclType);
                        }
                    });
                    var schemaMaps = {
                        subjects: new _map2.default(),
                        resources: new _map2.default()
                    };
                    var _arr = ['subjects', 'resources'];
                    for (var _i = 0; _i < _arr.length; _i++) {
                        var type = _arr[_i];
                        var nodes = void 0,
                            tyrObjects = void 0;
                        if (type === 'subjects') {
                            nodes = schemaMaps.subjects;
                            tyrObjects = schemaObjects.subjects;
                        } else {
                            nodes = schemaMaps.resources;
                            tyrObjects = schemaObjects.resources;
                        }
                        var _iteratorNormalCompletion2 = true;
                        var _didIteratorError2 = false;
                        var _iteratorError2 = undefined;

                        try {
                            var _loop = function _loop() {
                                var node = _step2.value;

                                var name = node.collection.def.name,
                                    parentName = node.link.def.name,
                                    parentNamePath = node.collection.parsePath(node.path);
                                nodes.set(name, { name: name,
                                    id: '$uid',
                                    parent: parentName,
                                    repository: GraclPlugin.makeRepository(node.collection),
                                    getParents: function getParents() {
                                        return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee() {
                                            var thisNode, ids, linkCollection, parentObjects, ParentClass;
                                            return _regenerator2.default.wrap(function _callee$(_context) {
                                                while (1) {
                                                    switch (_context.prev = _context.next) {
                                                        case 0:
                                                            thisNode = this;
                                                            ids = parentNamePath.get(thisNode.doc);

                                                            if (!(ids instanceof Array)) {
                                                                ids = [ids];
                                                            }
                                                            linkCollection = node.link;
                                                            _context.next = 6;
                                                            return linkCollection.find((0, _defineProperty3.default)({}, linkCollection.def.primaryKey.field, { $in: ids }), null, { tyranid: { insecure: true } });

                                                        case 6:
                                                            parentObjects = _context.sent;
                                                            ParentClass = thisNode.getParentClass();
                                                            return _context.abrupt('return', parentObjects.map(function (doc) {
                                                                return new ParentClass(doc);
                                                            }));

                                                        case 9:
                                                        case 'end':
                                                            return _context.stop();
                                                    }
                                                }
                                            }, _callee, this);
                                        }));
                                    }
                                });
                            };

                            for (var _iterator2 = (0, _getIterator3.default)(tyrObjects.links), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                                _loop();
                            }
                        } catch (err) {
                            _didIteratorError2 = true;
                            _iteratorError2 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                                    _iterator2.return();
                                }
                            } finally {
                                if (_didIteratorError2) {
                                    throw _iteratorError2;
                                }
                            }
                        }

                        var _iteratorNormalCompletion3 = true;
                        var _didIteratorError3 = false;
                        var _iteratorError3 = undefined;

                        try {
                            for (var _iterator3 = (0, _getIterator3.default)(tyrObjects.parents), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                                var parent = _step3.value;

                                var name = parent.def.name;
                                if (!nodes.has(name)) {
                                    nodes.set(name, {
                                        name: name,
                                        id: '$uid',
                                        repository: GraclPlugin.makeRepository(parent)
                                    });
                                }
                            }
                        } catch (err) {
                            _didIteratorError3 = true;
                            _iteratorError3 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                    _iterator3.return();
                                }
                            } finally {
                                if (_didIteratorError3) {
                                    throw _iteratorError3;
                                }
                            }
                        }
                    }
                    _this.log('creating link graph.');
                    _this.outgoingLinkPaths = GraclPlugin.buildLinkGraph();
                    _this.graclHierarchy = new gracl.Graph({
                        subjects: (0, _from2.default)(schemaMaps.subjects.values()),
                        resources: (0, _from2.default)(schemaMaps.resources.values())
                    });
                    _this.log('created gracl hierarchy based on tyranid schemas: ');
                    if (_this.verbose) {
                        console.log('  | \n  | ' + (0, _stringify2.default)(_this.getObjectHierarchy(), null, 4).replace(/[{},\":]/g, '').replace(/^\s*\n/gm, '').split('\n').join('\n  | ').replace(/\s+$/, '').replace(/resources/, '---- resources ----').replace(/subjects/, '---- subjects ----') + '____');
                    }
                })();
            }
        }
    }, {
        key: 'query',
        value: function query(queriedCollection, permissionAction) {
            var user = arguments.length <= 2 || arguments[2] === undefined ? Tyr.local.user : arguments[2];

            return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee3() {
                var _this2 = this;

                var queriedCollectionName, permissionType, ResourceClass, SubjectClass, subject, errorMessageHeader, subjectHierarchyIds, resourceHierarchyClasses, permissionsQuery, permissions, resourceMap, queriedCollectionLinkFields, queryMaps, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, _step4$value, _collectionName, _step4$value$, collection, _permissions, queryRestrictionSet, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, permission, access, key, positiveRestriction, negativeRestriction, restricted, hasPositive, hasNegative;

                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                queriedCollectionName = queriedCollection.def.name;

                                if (!(queriedCollectionName === PermissionsModel_1.PermissionsModel.def.name)) {
                                    _context3.next = 4;
                                    break;
                                }

                                this.log('skipping query modification for ' + PermissionsModel_1.PermissionsModel.def.name);
                                return _context3.abrupt('return', {});

                            case 4:
                                permissionType = permissionAction + '-' + queriedCollectionName;

                                if (permissionAction) {
                                    _context3.next = 7;
                                    break;
                                }

                                throw new Error('No permissionAction given to GraclPlugin.query()!');

                            case 7:
                                if (this.graclHierarchy) {
                                    _context3.next = 9;
                                    break;
                                }

                                throw new Error('Must call GraclPlugin.boot() before using GraclPlugin.query()!');

                            case 9:
                                if (user) {
                                    _context3.next = 12;
                                    break;
                                }

                                this.log('No user passed to GraclPlugin.query() (or found on Tyr.local) -- no documents allowed!');
                                return _context3.abrupt('return', false);

                            case 12:
                                this.log('restricting query for collection = ' + queriedCollectionName + ' ' + ('permissionType = ' + permissionType + ' ') + ('user = ' + (0, _stringify2.default)(user.$toClient())));

                                if (this.graclHierarchy.resources.has(queriedCollectionName)) {
                                    _context3.next = 16;
                                    break;
                                }

                                this.log('Querying against collection (' + queriedCollectionName + ') with no resource class -- no restriction enforced!');
                                return _context3.abrupt('return', {});

                            case 16:
                                ResourceClass = this.graclHierarchy.getResource(queriedCollectionName), SubjectClass = this.graclHierarchy.getSubject(user.$model.def.name);
                                subject = new SubjectClass(user);
                                errorMessageHeader = 'Unable to construct query object for ' + queriedCollection.name + ' ' + ('from the perspective of ' + subject.toString());
                                _context3.next = 21;
                                return subject.getHierarchyIds();

                            case 21:
                                subjectHierarchyIds = _context3.sent;
                                resourceHierarchyClasses = ResourceClass.getHierarchyClassNames();
                                permissionsQuery = {
                                    subjectId: { $in: subjectHierarchyIds },
                                    resourceType: { $in: resourceHierarchyClasses }
                                };
                                _context3.next = 26;
                                return PermissionsModel_1.PermissionsModel.find(permissionsQuery, null, { tyranid: { insecure: true } });

                            case 26:
                                permissions = _context3.sent;

                                if (!(!Array.isArray(permissions) || permissions.length === 0)) {
                                    _context3.next = 30;
                                    break;
                                }

                                this.log('No permissions found, returning false!');
                                return _context3.abrupt('return', false);

                            case 30:
                                resourceMap = permissions.reduce(function (map, perm) {
                                    var resourceCollectionName = perm['resourceType'],
                                        resourceId = perm['resourceId'];
                                    if (!map.has(resourceCollectionName)) {
                                        map.set(resourceCollectionName, {
                                            collection: Tyr.byName[resourceCollectionName],
                                            permissions: new _map2.default()
                                        });
                                    }
                                    map.get(resourceCollectionName).permissions.set(resourceId, perm);
                                    return map;
                                }, new _map2.default());
                                queriedCollectionLinkFields = util_1.getCollectionLinksSorted(queriedCollection).reduce(function (map, field) {
                                    map.set(field.def.link, field);
                                    return map;
                                }, new _map2.default());
                                queryMaps = {
                                    positive: new _map2.default(),
                                    negative: new _map2.default()
                                };
                                _iteratorNormalCompletion4 = true;
                                _didIteratorError4 = false;
                                _iteratorError4 = undefined;
                                _context3.prev = 36;
                                _iterator4 = (0, _getIterator3.default)(resourceMap);

                            case 38:
                                if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                                    _context3.next = 87;
                                    break;
                                }

                                _step4$value = (0, _slicedToArray3.default)(_step4.value, 2);
                                _collectionName = _step4$value[0];
                                _step4$value$ = _step4$value[1];
                                collection = _step4$value$.collection;
                                _permissions = _step4$value$.permissions;
                                queryRestrictionSet = false;

                                if (!queriedCollectionLinkFields.has(_collectionName)) {
                                    _context3.next = 81;
                                    break;
                                }

                                _iteratorNormalCompletion5 = true;
                                _didIteratorError5 = false;
                                _iteratorError5 = undefined;
                                _context3.prev = 49;
                                _iterator5 = (0, _getIterator3.default)(_permissions.values());

                            case 51:
                                if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
                                    _context3.next = 65;
                                    break;
                                }

                                permission = _step5.value;
                                access = permission.access[permissionType];
                                _context3.t0 = access;
                                _context3.next = _context3.t0 === true ? 57 : _context3.t0 === false ? 57 : 61;
                                break;

                            case 57:
                                key = access ? 'positive' : 'negative';

                                if (!queryMaps[key].has(_collectionName)) {
                                    queryMaps[key].set(_collectionName, new _set2.default());
                                }
                                queryMaps[key].get(_collectionName).add(permission.resourceId);
                                return _context3.abrupt('break', 61);

                            case 61:
                                queryRestrictionSet = true;

                            case 62:
                                _iteratorNormalCompletion5 = true;
                                _context3.next = 51;
                                break;

                            case 65:
                                _context3.next = 71;
                                break;

                            case 67:
                                _context3.prev = 67;
                                _context3.t1 = _context3['catch'](49);
                                _didIteratorError5 = true;
                                _iteratorError5 = _context3.t1;

                            case 71:
                                _context3.prev = 71;
                                _context3.prev = 72;

                                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                                    _iterator5.return();
                                }

                            case 74:
                                _context3.prev = 74;

                                if (!_didIteratorError5) {
                                    _context3.next = 77;
                                    break;
                                }

                                throw _iteratorError5;

                            case 77:
                                return _context3.finish(74);

                            case 78:
                                return _context3.finish(71);

                            case 79:
                                _context3.next = 82;
                                break;

                            case 81:
                                return _context3.delegateYield(_regenerator2.default.mark(function _callee2() {
                                    var path, pathEndCollectionName, positiveIds, negativeIds, _iteratorNormalCompletion6, _didIteratorError6, _iteratorError6, _iterator6, _step6, _permission, _access, pathEndCollection, nextCollection, pathCollectionName, nextCollectionName, pathCollection, _nextCollection, linkedCollectionName, addIdsToQueryMap;

                                    return _regenerator2.default.wrap(function _callee2$(_context2) {
                                        while (1) {
                                            switch (_context2.prev = _context2.next) {
                                                case 0:
                                                    path = _this2.getShortestPath(queriedCollection, collection);

                                                    if (path.length) {
                                                        _context2.next = 3;
                                                        break;
                                                    }

                                                    throw new Error(errorMessageHeader + ', as there is no path between ' + ('collections ' + queriedCollectionName + ' and ' + _collectionName + ' in the schema.'));

                                                case 3:
                                                    pathEndCollectionName = path.pop();

                                                    if (!(_collectionName !== pathEndCollectionName)) {
                                                        _context2.next = 6;
                                                        break;
                                                    }

                                                    throw new Error('Path returned for collection pair ' + queriedCollectionName + ' and ' + _collectionName + ' is invalid!');

                                                case 6:
                                                    if (queriedCollectionLinkFields.has(path[1])) {
                                                        _context2.next = 8;
                                                        break;
                                                    }

                                                    throw new Error('Path returned for collection pair ' + queriedCollectionName + ' and ' + _collectionName + ' ' + 'must have the penultimate path exist as a link on the collection being queried, ' + ('the penultimate collection path between ' + queriedCollectionName + ' and ' + _collectionName + ' ') + ('is ' + path[1] + ', which is not linked to by ' + queriedCollectionName));

                                                case 8:
                                                    positiveIds = [], negativeIds = [];
                                                    _iteratorNormalCompletion6 = true;
                                                    _didIteratorError6 = false;
                                                    _iteratorError6 = undefined;
                                                    _context2.prev = 12;
                                                    _iterator6 = (0, _getIterator3.default)(_permissions.values());

                                                case 14:
                                                    if (_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done) {
                                                        _context2.next = 27;
                                                        break;
                                                    }

                                                    _permission = _step6.value;
                                                    _access = _permission.access[permissionType];
                                                    _context2.t0 = _access;
                                                    _context2.next = _context2.t0 === true ? 20 : _context2.t0 === false ? 22 : 24;
                                                    break;

                                                case 20:
                                                    positiveIds.push(Tyr.parseUid(_permission.resourceId).id);
                                                    return _context2.abrupt('break', 24);

                                                case 22:
                                                    negativeIds.push(Tyr.parseUid(_permission.resourceId).id);
                                                    return _context2.abrupt('break', 24);

                                                case 24:
                                                    _iteratorNormalCompletion6 = true;
                                                    _context2.next = 14;
                                                    break;

                                                case 27:
                                                    _context2.next = 33;
                                                    break;

                                                case 29:
                                                    _context2.prev = 29;
                                                    _context2.t1 = _context2['catch'](12);
                                                    _didIteratorError6 = true;
                                                    _iteratorError6 = _context2.t1;

                                                case 33:
                                                    _context2.prev = 33;
                                                    _context2.prev = 34;

                                                    if (!_iteratorNormalCompletion6 && _iterator6.return) {
                                                        _iterator6.return();
                                                    }

                                                case 36:
                                                    _context2.prev = 36;

                                                    if (!_didIteratorError6) {
                                                        _context2.next = 39;
                                                        break;
                                                    }

                                                    throw _iteratorError6;

                                                case 39:
                                                    return _context2.finish(36);

                                                case 40:
                                                    return _context2.finish(33);

                                                case 41:
                                                    pathEndCollection = Tyr.byName[pathEndCollectionName], nextCollection = Tyr.byName[_.last(path)];
                                                    _context2.next = 44;
                                                    return util_1.stepThroughCollectionPath(positiveIds, pathEndCollection, nextCollection);

                                                case 44:
                                                    positiveIds = _context2.sent;
                                                    _context2.next = 47;
                                                    return util_1.stepThroughCollectionPath(negativeIds, pathEndCollection, nextCollection);

                                                case 47:
                                                    negativeIds = _context2.sent;
                                                    pathCollectionName = void 0, nextCollectionName = void 0;

                                                case 49:
                                                    if (!(path.length > 2)) {
                                                        _context2.next = 61;
                                                        break;
                                                    }

                                                    pathCollection = Tyr.byName[pathCollectionName = path.pop()], _nextCollection = Tyr.byName[nextCollectionName = _.last(path)];

                                                    if (pathCollection) {
                                                        _context2.next = 53;
                                                        break;
                                                    }

                                                    throw new Error(errorMessageHeader + ', invalid collection name given in path! collection: ' + pathCollectionName);

                                                case 53:
                                                    _context2.next = 55;
                                                    return util_1.stepThroughCollectionPath(positiveIds, pathCollection, _nextCollection);

                                                case 55:
                                                    positiveIds = _context2.sent;
                                                    _context2.next = 58;
                                                    return util_1.stepThroughCollectionPath(negativeIds, pathCollection, _nextCollection);

                                                case 58:
                                                    negativeIds = _context2.sent;
                                                    _context2.next = 49;
                                                    break;

                                                case 61:
                                                    linkedCollectionName = nextCollection.def.name;

                                                    addIdsToQueryMap = function addIdsToQueryMap(access) {
                                                        return function (id) {
                                                            var accessString = access ? 'positive' : 'negative',
                                                                altAccessString = access ? 'negative' : 'positive';
                                                            if (!queryMaps[accessString].has(linkedCollectionName)) {
                                                                queryMaps[accessString].set(linkedCollectionName, new _set2.default());
                                                            }
                                                            if (!queryMaps[altAccessString].has(linkedCollectionName) || !queryMaps[altAccessString].get(linkedCollectionName).has(id)) {
                                                                queryMaps[accessString].get(linkedCollectionName).add(id);
                                                            }
                                                        };
                                                    };

                                                    _.each(positiveIds, addIdsToQueryMap(true));
                                                    _.each(negativeIds, addIdsToQueryMap(false));
                                                    queryRestrictionSet = true;

                                                case 66:
                                                case 'end':
                                                    return _context2.stop();
                                            }
                                        }
                                    }, _callee2, _this2, [[12, 29, 33, 41], [34,, 36, 40]]);
                                })(), 't2', 82);

                            case 82:
                                if (queryRestrictionSet) {
                                    _context3.next = 84;
                                    break;
                                }

                                throw new Error(errorMessageHeader + ', unable to set query restriction ' + ('to satisfy permissions relating to collection ' + _collectionName));

                            case 84:
                                _iteratorNormalCompletion4 = true;
                                _context3.next = 38;
                                break;

                            case 87:
                                _context3.next = 93;
                                break;

                            case 89:
                                _context3.prev = 89;
                                _context3.t3 = _context3['catch'](36);
                                _didIteratorError4 = true;
                                _iteratorError4 = _context3.t3;

                            case 93:
                                _context3.prev = 93;
                                _context3.prev = 94;

                                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                                    _iterator4.return();
                                }

                            case 96:
                                _context3.prev = 96;

                                if (!_didIteratorError4) {
                                    _context3.next = 99;
                                    break;
                                }

                                throw _iteratorError4;

                            case 99:
                                return _context3.finish(96);

                            case 100:
                                return _context3.finish(93);

                            case 101:
                                positiveRestriction = util_1.createInQueries(queryMaps['positive'], queriedCollection, '$in'), negativeRestriction = util_1.createInQueries(queryMaps['negative'], queriedCollection, '$nin');
                                restricted = {}, hasPositive = _.chain(positiveRestriction).keys().any().value(), hasNegative = _.chain(negativeRestriction).keys().any().value();

                                if (hasNegative && hasPositive) {
                                    restricted['$and'] = [positiveRestriction, negativeRestriction];
                                } else if (hasNegative) {
                                    (0, _assign2.default)(restricted, negativeRestriction);
                                } else if (hasPositive) {
                                    (0, _assign2.default)(restricted, positiveRestriction);
                                }
                                return _context3.abrupt('return', restricted);

                            case 105:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this, [[36, 89, 93, 101], [49, 67, 71, 79], [72,, 74, 78], [94,, 96, 100]]);
            }));
        }
    }], [{
        key: 'makeRepository',
        value: function makeRepository(collection) {
            return {
                getEntity: function getEntity(id, node) {
                    return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee4() {
                        return _regenerator2.default.wrap(function _callee4$(_context4) {
                            while (1) {
                                switch (_context4.prev = _context4.next) {
                                    case 0:
                                        _context4.t0 = collection;
                                        _context4.next = 3;
                                        return collection.byId(id);

                                    case 3:
                                        _context4.t1 = _context4.sent;
                                        _context4.next = 6;
                                        return _context4.t0.populate.call(_context4.t0, 'permissionIds', _context4.t1);

                                    case 6:
                                        return _context4.abrupt('return', _context4.sent);

                                    case 7:
                                    case 'end':
                                        return _context4.stop();
                                }
                            }
                        }, _callee4, this);
                    }));
                },
                saveEntity: function saveEntity(id, doc, node) {
                    return __awaiter(this, void 0, _promise2.default, _regenerator2.default.mark(function _callee5() {
                        return _regenerator2.default.wrap(function _callee5$(_context5) {
                            while (1) {
                                switch (_context5.prev = _context5.next) {
                                    case 0:
                                        return _context5.abrupt('return', PermissionsModel_1.PermissionsModel.updatePermissions(doc));

                                    case 1:
                                    case 'end':
                                        return _context5.stop();
                                }
                            }
                        }, _callee5, this);
                    }));
                }
            };
        }
    }, {
        key: 'buildLinkGraph',
        value: function buildLinkGraph() {
            var g = {};
            _.each(Tyr.collections, function (col) {
                var links = col.links({ direction: 'outgoing' }),
                    colName = col.def.name;
                _.each(links, function (linkField) {
                    var edges = _.get(g, colName, new _set2.default()),
                        linkName = linkField.link.def.name;
                    edges.add(linkName);
                    _.set(g, linkName, _.get(g, linkName, new _set2.default()));
                    _.set(g, colName, edges);
                });
            });
            var dist = {},
                next = {},
                keys = _.keys(g);
            _.each(keys, function (a) {
                _.each(keys, function (b) {
                    _.set(dist, a + '.' + b, Infinity);
                });
            });
            _.each(keys, function (a) {
                _.set(dist, a + '.' + a, 0);
            });
            _.each(keys, function (a) {
                _.each(keys, function (b) {
                    if (g[a].has(b)) {
                        _.set(dist, a + '.' + b, 1);
                        _.set(next, a + '.' + b, b);
                    }
                });
            });
            _.each(keys, function (a) {
                _.each(keys, function (b) {
                    _.each(keys, function (c) {
                        if (dist[b][c] > dist[b][a] + dist[a][c]) {
                            dist[b][c] = dist[b][a] + dist[a][c];
                            next[b][c] = next[b][a];
                        }
                    });
                });
            });
            return next;
        }
    }]);
    return GraclPlugin;
}();

exports.GraclPlugin = GraclPlugin;