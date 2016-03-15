"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

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
var Tyr = require('tyranid');
var PermissionsModel_1 = require('../collections/PermissionsModel');
var gracl = require('gracl');
var _ = require('lodash');
function createInQueries(map, queriedCollection, key) {
    return Array.from(map.entries()).reduce(function (out, _ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var col = _ref2[0];
        var uids = _ref2[1];

        if (col === queriedCollection.def.name) {
            col = queriedCollection.def.primaryKey.field;
        }
        out[col] = _defineProperty({}, key, [].concat(_toConsumableArray(uids)).map(function (u) {
            return Tyr.parseUid(u).id;
        }));
        return out;
    }, {});
}
exports.createInQueries = createInQueries;
;

var GraclPlugin = function () {
    function GraclPlugin() {
        var verbose = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

        _classCallCheck(this, GraclPlugin);

        this.verbose = verbose;
    }

    _createClass(GraclPlugin, [{
        key: 'log',
        value: function log(message) {
            if (this.verbose) {
                console.log('tyranid-gracl: ' + message);
            }
            return this;
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
                    var collections = Tyr.collections,
                        nodeSet = new Set();
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

                        var _linkFields = _slicedToArray(linkFields, 1);

                        var field = _linkFields[0];var graclType = field.def.graclType;

                        if (!graclType) return;
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
                        subjects: new Map(),
                        resources: new Map()
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
                        var _iteratorNormalCompletion = true;
                        var _didIteratorError = false;
                        var _iteratorError = undefined;

                        try {
                            for (var _iterator = tyrObjects.links[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                var node = _step.value;

                                var name = node.collection.def.name,
                                    parentName = node.link.def.name;
                                nodes.set(name, { name: name,
                                    parent: parentName,
                                    parentId: node.name === node.path ? node.name : node.path.split('.')[0],
                                    repository: GraclPlugin.makeRepository(node.collection)
                                });
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

                        var _iteratorNormalCompletion2 = true;
                        var _didIteratorError2 = false;
                        var _iteratorError2 = undefined;

                        try {
                            for (var _iterator2 = tyrObjects.parents[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                                var parent = _step2.value;

                                var _name = parent.def.name;
                                if (!nodes.has(_name)) {
                                    nodes.set(_name, {
                                        name: _name,
                                        repository: GraclPlugin.makeRepository(parent)
                                    });
                                }
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
                    }
                    _this.log('creating link graph.');
                    _this.outgoingLinkPaths = GraclPlugin.buildLinkGraph();
                    _this.log('creating gracl hierarchy');
                    _this.graclHierarchy = new gracl.Graph({
                        subjects: Array.from(schemaMaps.subjects.values()),
                        resources: Array.from(schemaMaps.resources.values())
                    });
                })();
            }
        }
    }, {
        key: 'query',
        value: function query(queriedCollection, permissionType) {
            var user = arguments.length <= 2 || arguments[2] === undefined ? Tyr.local.user : arguments[2];

            return __awaiter(this, void 0, Promise, regeneratorRuntime.mark(function _callee() {
                var _this2 = this;

                var ResourceClass, SubjectClass, subject, errorMessageHeader, subjectHierarchyIds, resourceHierarchyClasses, permissions, resourceMap, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, perm, resourceCollectionName, resourceId, queriedCollectionLinkFields, queryMaps, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _loop, _iterator4, _step4;

                return regeneratorRuntime.wrap(function _callee$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (permissionType) {
                                    _context3.next = 2;
                                    break;
                                }

                                throw new Error('No permissionType given to GraclPlugin.query()!');

                            case 2:
                                if (this.graclHierarchy) {
                                    _context3.next = 4;
                                    break;
                                }

                                throw new Error('Must call GraclPlugin.boot() before using GraclPlugin.query()!');

                            case 4:
                                if (user) {
                                    _context3.next = 7;
                                    break;
                                }

                                console.warn('No user passed to GraclPlugin.query() (or found on Tyr.local) -- no restriction enforced!');
                                return _context3.abrupt('return', false);

                            case 7:
                                ResourceClass = this.graclHierarchy.getResource(queriedCollection.def.name), SubjectClass = this.graclHierarchy.getSubject(user.$model.def.name);
                                subject = new SubjectClass(user);
                                errorMessageHeader = 'Unable to construct query object for ' + queriedCollection.name + ' ' + ('from the perspective of ' + subject.toString());
                                _context3.next = 12;
                                return subject.getHierarchyIds();

                            case 12:
                                subjectHierarchyIds = _context3.sent;
                                resourceHierarchyClasses = ResourceClass.getHierarchyClassNames();
                                _context3.next = 16;
                                return PermissionsModel_1.PermissionsModel.find({
                                    subjectId: { $in: subjectHierarchyIds },
                                    resourceType: { $in: resourceHierarchyClasses }
                                });

                            case 16:
                                permissions = _context3.sent;

                                if (!(!Array.isArray(permissions) || permissions.length === 0)) {
                                    _context3.next = 19;
                                    break;
                                }

                                return _context3.abrupt('return', false);

                            case 19:
                                resourceMap = new Map();
                                _iteratorNormalCompletion3 = true;
                                _didIteratorError3 = false;
                                _iteratorError3 = undefined;
                                _context3.prev = 23;

                                for (_iterator3 = permissions[Symbol.iterator](); !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                                    perm = _step3.value;
                                    resourceCollectionName = perm['resourceType'], resourceId = perm['resourceId'];

                                    if (!resourceMap.has(resourceCollectionName)) {
                                        resourceMap.set(resourceCollectionName, {
                                            collection: Tyr.byName[resourceCollectionName],
                                            permissions: new Map()
                                        });
                                    }
                                    resourceMap.get(resourceCollectionName).permissions.set(resourceId, perm);
                                }
                                _context3.next = 31;
                                break;

                            case 27:
                                _context3.prev = 27;
                                _context3.t0 = _context3['catch'](23);
                                _didIteratorError3 = true;
                                _iteratorError3 = _context3.t0;

                            case 31:
                                _context3.prev = 31;
                                _context3.prev = 32;

                                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                    _iterator3.return();
                                }

                            case 34:
                                _context3.prev = 34;

                                if (!_didIteratorError3) {
                                    _context3.next = 37;
                                    break;
                                }

                                throw _iteratorError3;

                            case 37:
                                return _context3.finish(34);

                            case 38:
                                return _context3.finish(31);

                            case 39:
                                queriedCollectionLinkFields = new Map();

                                queriedCollection.links({ direction: 'outgoing' }).forEach(function (field) {
                                    queriedCollectionLinkFields.set(field.def.link, field);
                                });
                                queryMaps = {
                                    positive: new Map(),
                                    negative: new Map()
                                };
                                _iteratorNormalCompletion4 = true;
                                _didIteratorError4 = false;
                                _iteratorError4 = undefined;
                                _context3.prev = 45;
                                _loop = regeneratorRuntime.mark(function _loop() {
                                    var _step4$value, collectionName, _step4$value$, collection, permissions, queryRestrictionSet, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, permission, access, key, path, positiveIds, negativeIds, _iteratorNormalCompletion6, _didIteratorError6, _iteratorError6, _iterator6, _step6, _permission, _access, pathCollectionName, resultCollection, _loop2, _ret3;

                                    return regeneratorRuntime.wrap(function _loop$(_context2) {
                                        while (1) {
                                            switch (_context2.prev = _context2.next) {
                                                case 0:
                                                    _step4$value = _slicedToArray(_step4.value, 2);
                                                    collectionName = _step4$value[0];
                                                    _step4$value$ = _step4$value[1];
                                                    collection = _step4$value$.collection;
                                                    permissions = _step4$value$.permissions;
                                                    queryRestrictionSet = false;

                                                    if (!queriedCollectionLinkFields.has(collectionName)) {
                                                        _context2.next = 42;
                                                        break;
                                                    }

                                                    _iteratorNormalCompletion5 = true;
                                                    _didIteratorError5 = false;
                                                    _iteratorError5 = undefined;
                                                    _context2.prev = 10;
                                                    _iterator5 = permissions.values()[Symbol.iterator]();

                                                case 12:
                                                    if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
                                                        _context2.next = 26;
                                                        break;
                                                    }

                                                    permission = _step5.value;
                                                    access = permission.access[permissionType];
                                                    _context2.t0 = access;
                                                    _context2.next = _context2.t0 === true ? 18 : _context2.t0 === false ? 18 : 22;
                                                    break;

                                                case 18:
                                                    key = access ? 'positive' : 'negative';

                                                    if (!queryMaps[key].has(collectionName)) {
                                                        queryMaps[key].set(collectionName, new Set());
                                                    }
                                                    queryMaps[key].get(collectionName).add(permission.resourceId);
                                                    return _context2.abrupt('break', 22);

                                                case 22:
                                                    queryRestrictionSet = true;

                                                case 23:
                                                    _iteratorNormalCompletion5 = true;
                                                    _context2.next = 12;
                                                    break;

                                                case 26:
                                                    _context2.next = 32;
                                                    break;

                                                case 28:
                                                    _context2.prev = 28;
                                                    _context2.t1 = _context2['catch'](10);
                                                    _didIteratorError5 = true;
                                                    _iteratorError5 = _context2.t1;

                                                case 32:
                                                    _context2.prev = 32;
                                                    _context2.prev = 33;

                                                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                                                        _iterator5.return();
                                                    }

                                                case 35:
                                                    _context2.prev = 35;

                                                    if (!_didIteratorError5) {
                                                        _context2.next = 38;
                                                        break;
                                                    }

                                                    throw _iteratorError5;

                                                case 38:
                                                    return _context2.finish(35);

                                                case 39:
                                                    return _context2.finish(32);

                                                case 40:
                                                    _context2.next = 89;
                                                    break;

                                                case 42:
                                                    path = _this2.getShortestPath(queriedCollection, collection);

                                                    if (path.length) {
                                                        _context2.next = 45;
                                                        break;
                                                    }

                                                    throw new Error(errorMessageHeader + ', as there is no path between ' + ('collections ' + queriedCollection.def.name + ' and ' + collectionName + ' in the schema.'));

                                                case 45:
                                                    positiveIds = [], negativeIds = [];
                                                    _iteratorNormalCompletion6 = true;
                                                    _didIteratorError6 = false;
                                                    _iteratorError6 = undefined;
                                                    _context2.prev = 49;
                                                    _iterator6 = permissions.values()[Symbol.iterator]();

                                                case 51:
                                                    if (_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done) {
                                                        _context2.next = 64;
                                                        break;
                                                    }

                                                    _permission = _step6.value;
                                                    _access = _permission.access[permissionType];
                                                    _context2.t2 = _access;
                                                    _context2.next = _context2.t2 === true ? 57 : _context2.t2 === false ? 59 : 61;
                                                    break;

                                                case 57:
                                                    positiveIds.push(_permission.resourceId);
                                                    return _context2.abrupt('break', 61);

                                                case 59:
                                                    negativeIds.push(_permission.resourceId);
                                                    return _context2.abrupt('break', 61);

                                                case 61:
                                                    _iteratorNormalCompletion6 = true;
                                                    _context2.next = 51;
                                                    break;

                                                case 64:
                                                    _context2.next = 70;
                                                    break;

                                                case 66:
                                                    _context2.prev = 66;
                                                    _context2.t3 = _context2['catch'](49);
                                                    _didIteratorError6 = true;
                                                    _iteratorError6 = _context2.t3;

                                                case 70:
                                                    _context2.prev = 70;
                                                    _context2.prev = 71;

                                                    if (!_iteratorNormalCompletion6 && _iterator6.return) {
                                                        _iterator6.return();
                                                    }

                                                case 73:
                                                    _context2.prev = 73;

                                                    if (!_didIteratorError6) {
                                                        _context2.next = 76;
                                                        break;
                                                    }

                                                    throw _iteratorError6;

                                                case 76:
                                                    return _context2.finish(73);

                                                case 77:
                                                    return _context2.finish(70);

                                                case 78:
                                                    pathCollectionName = void 0, resultCollection = _.first(path);
                                                    _loop2 = regeneratorRuntime.mark(function _loop2() {
                                                        var pathCollection, nextCollection, collectionIdField, pathCollectionLinks, nextCollectionField, nextCollectionFieldName;
                                                        return regeneratorRuntime.wrap(function _loop2$(_context) {
                                                            while (1) {
                                                                switch (_context.prev = _context.next) {
                                                                    case 0:
                                                                        if (!(pathCollectionName === queriedCollection.def.name)) {
                                                                            _context.next = 2;
                                                                            break;
                                                                        }

                                                                        return _context.abrupt('return', 'break');

                                                                    case 2:
                                                                        pathCollection = Tyr.byName[pathCollectionName], nextCollection = Tyr.byName[_.last(path)], collectionIdField = pathCollection.def.primaryKey.field, pathCollectionLinks = pathCollection.links({ direction: 'outgoing' });
                                                                        nextCollectionField = _.find(pathCollectionLinks, function (link) {
                                                                            return link.collection.def.name === nextCollection.def.name;
                                                                        });
                                                                        nextCollectionFieldName = nextCollectionField.name === nextCollectionField.path ? nextCollectionField.name : nextCollectionField.path.split('.')[0];
                                                                        _context.t0 = _;
                                                                        _context.next = 8;
                                                                        return pathCollection.byIds(positiveIds);

                                                                    case 8:
                                                                        _context.t1 = _context.sent;
                                                                        _context.t2 = nextCollectionFieldName;
                                                                        positiveIds = _context.t0.chain.call(_context.t0, _context.t1).map(_context.t2).flatten().value();
                                                                        _context.t3 = _;
                                                                        _context.next = 14;
                                                                        return pathCollection.byIds(negativeIds);

                                                                    case 14:
                                                                        _context.t4 = _context.sent;
                                                                        _context.t5 = nextCollectionFieldName;
                                                                        negativeIds = _context.t3.chain.call(_context.t3, _context.t4).map(_context.t5).flatten().value();

                                                                        if (pathCollection) {
                                                                            _context.next = 19;
                                                                            break;
                                                                        }

                                                                        throw new Error(errorMessageHeader + ', invalid collection name given in path! collection: ' + pathCollectionName);

                                                                    case 19:
                                                                    case 'end':
                                                                        return _context.stop();
                                                                }
                                                            }
                                                        }, _loop2, _this2);
                                                    });

                                                case 80:
                                                    if (!(pathCollectionName = path.pop())) {
                                                        _context2.next = 87;
                                                        break;
                                                    }

                                                    return _context2.delegateYield(_loop2(), 't4', 82);

                                                case 82:
                                                    _ret3 = _context2.t4;

                                                    if (!(_ret3 === 'break')) {
                                                        _context2.next = 85;
                                                        break;
                                                    }

                                                    return _context2.abrupt('break', 87);

                                                case 85:
                                                    _context2.next = 80;
                                                    break;

                                                case 87:
                                                    _.each(positiveIds, function (id) {
                                                        if (!queryMaps['positive'].has(collectionName)) {
                                                            queryMaps['positive'].set(collectionName, new Set());
                                                        }
                                                        if (!queryMaps['negative'].has(collectionName) || queryMaps['negative'].get(collectionName).has(id)) {
                                                            queryMaps['positive'].get(collectionName).add(id);
                                                        }
                                                    });
                                                    _.each(negativeIds, function (id) {
                                                        if (!queryMaps['negative'].has(collectionName)) {
                                                            queryMaps['negative'].set(collectionName, new Set());
                                                        }
                                                        if (!queryMaps['positive'].has(collectionName) || !queryMaps['positive'].get(collectionName).has(id)) {
                                                            queryMaps['negative'].get(collectionName).add(id);
                                                        }
                                                    });

                                                case 89:
                                                    if (queryRestrictionSet) {
                                                        _context2.next = 91;
                                                        break;
                                                    }

                                                    throw new Error(errorMessageHeader + ', unable to set query restriction ' + ('to satisfy permissions relating to collection ' + collectionName));

                                                case 91:
                                                case 'end':
                                                    return _context2.stop();
                                            }
                                        }
                                    }, _loop, _this2, [[10, 28, 32, 40], [33,, 35, 39], [49, 66, 70, 78], [71,, 73, 77]]);
                                });
                                _iterator4 = resourceMap[Symbol.iterator]();

                            case 48:
                                if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                                    _context3.next = 53;
                                    break;
                                }

                                return _context3.delegateYield(_loop(), 't1', 50);

                            case 50:
                                _iteratorNormalCompletion4 = true;
                                _context3.next = 48;
                                break;

                            case 53:
                                _context3.next = 59;
                                break;

                            case 55:
                                _context3.prev = 55;
                                _context3.t2 = _context3['catch'](45);
                                _didIteratorError4 = true;
                                _iteratorError4 = _context3.t2;

                            case 59:
                                _context3.prev = 59;
                                _context3.prev = 60;

                                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                                    _iterator4.return();
                                }

                            case 62:
                                _context3.prev = 62;

                                if (!_didIteratorError4) {
                                    _context3.next = 65;
                                    break;
                                }

                                throw _iteratorError4;

                            case 65:
                                return _context3.finish(62);

                            case 66:
                                return _context3.finish(59);

                            case 67:
                                return _context3.abrupt('return', {
                                    $and: [createInQueries(queryMaps['positive'], queriedCollection, '$in'), createInQueries(queryMaps['negative'], queriedCollection, '$nin')]
                                });

                            case 68:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee, this, [[23, 27, 31, 39], [32,, 34, 38], [45, 55, 59, 67], [60,, 62, 66]]);
            }));
        }
    }], [{
        key: 'makeRepository',
        value: function makeRepository(collection) {
            return {
                getEntity: function getEntity(id) {
                    return __awaiter(this, void 0, Promise, regeneratorRuntime.mark(function _callee2() {
                        return regeneratorRuntime.wrap(function _callee2$(_context4) {
                            while (1) {
                                switch (_context4.prev = _context4.next) {
                                    case 0:
                                        _context4.t0 = collection;
                                        _context4.next = 3;
                                        return collection.byId(id);

                                    case 3:
                                        _context4.t1 = _context4.sent;
                                        _context4.next = 6;
                                        return _context4.t0.populate.call(_context4.t0, 'permissions', _context4.t1);

                                    case 6:
                                        return _context4.abrupt('return', _context4.sent);

                                    case 7:
                                    case 'end':
                                        return _context4.stop();
                                }
                            }
                        }, _callee2, this);
                    }));
                },
                saveEntity: function saveEntity(id, doc) {
                    return __awaiter(this, void 0, Promise, regeneratorRuntime.mark(function _callee3() {
                        return regeneratorRuntime.wrap(function _callee3$(_context5) {
                            while (1) {
                                switch (_context5.prev = _context5.next) {
                                    case 0:
                                        _context5.next = 2;
                                        return PermissionsModel_1.PermissionsModel.updatePermissions(doc, 'subject');

                                    case 2:
                                        _context5.next = 4;
                                        return doc.$save();

                                    case 4:
                                        return _context5.abrupt('return', _context5.sent);

                                    case 5:
                                    case 'end':
                                        return _context5.stop();
                                }
                            }
                        }, _callee3, this);
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
                    var edges = _.get(g, colName, new Set()),
                        linkName = linkField.link.def.name;
                    edges.add(linkName);
                    _.set(g, linkName, _.get(g, linkName, new Set()));
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