"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
        out[col] = _defineProperty({}, key, uids.map(function (u) {
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
                var ResourceClass, SubjectClass, subject, errorMessageHeader, subjectHierarchyIds, resourceHierarchyClasses, permissions, resourceMap, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, perm, resourceCollectionName, resourceId, queriedCollectionLinkFields, queryMaps, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, _step4$value, _collectionName, _step4$value$, collection, _permissions, queryRestrictionSet, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, permission, access, key, path, pathCollectionName, pathCollection;

                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (this.graclHierarchy) {
                                    _context.next = 2;
                                    break;
                                }

                                throw new Error('Must call this.boot() before using this.query()!');

                            case 2:
                                if (user) {
                                    _context.next = 4;
                                    break;
                                }

                                return _context.abrupt('return', false);

                            case 4:
                                ResourceClass = this.graclHierarchy.getResource(queriedCollection.def.name), SubjectClass = this.graclHierarchy.getSubject(user.$model.def.name);
                                subject = new SubjectClass(user);
                                errorMessageHeader = 'Unable to construct query object for ' + queriedCollection.name + ' ' + ('from the perspective of ' + subject.toString());
                                _context.next = 9;
                                return subject.getHierarchyIds();

                            case 9:
                                subjectHierarchyIds = _context.sent;
                                resourceHierarchyClasses = ResourceClass.getHierarchyClassNames();
                                _context.next = 13;
                                return PermissionsModel_1.PermissionsModel.find({
                                    subjectId: { $in: subjectHierarchyIds },
                                    resourceType: { $in: resourceHierarchyClasses }
                                });

                            case 13:
                                permissions = _context.sent;

                                if (Array.isArray(permissions)) {
                                    _context.next = 16;
                                    break;
                                }

                                return _context.abrupt('return', false);

                            case 16:
                                resourceMap = new Map();
                                _iteratorNormalCompletion3 = true;
                                _didIteratorError3 = false;
                                _iteratorError3 = undefined;
                                _context.prev = 20;

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
                                _context.next = 28;
                                break;

                            case 24:
                                _context.prev = 24;
                                _context.t0 = _context['catch'](20);
                                _didIteratorError3 = true;
                                _iteratorError3 = _context.t0;

                            case 28:
                                _context.prev = 28;
                                _context.prev = 29;

                                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                    _iterator3.return();
                                }

                            case 31:
                                _context.prev = 31;

                                if (!_didIteratorError3) {
                                    _context.next = 34;
                                    break;
                                }

                                throw _iteratorError3;

                            case 34:
                                return _context.finish(31);

                            case 35:
                                return _context.finish(28);

                            case 36:
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
                                _context.prev = 42;
                                _iterator4 = resourceMap[Symbol.iterator]();

                            case 44:
                                if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                                    _context.next = 96;
                                    break;
                                }

                                _step4$value = _slicedToArray(_step4.value, 2);
                                _collectionName = _step4$value[0];
                                _step4$value$ = _step4$value[1];
                                collection = _step4$value$.collection;
                                _permissions = _step4$value$.permissions;
                                queryRestrictionSet = false;

                                if (!queriedCollectionLinkFields.has(_collectionName)) {
                                    _context.next = 86;
                                    break;
                                }

                                _iteratorNormalCompletion5 = true;
                                _didIteratorError5 = false;
                                _iteratorError5 = undefined;
                                _context.prev = 55;
                                _iterator5 = _permissions.values()[Symbol.iterator]();

                            case 57:
                                if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
                                    _context.next = 70;
                                    break;
                                }

                                permission = _step5.value;
                                access = permission.access[permissionType];
                                _context.t1 = access;
                                _context.next = _context.t1 === true ? 63 : _context.t1 === false ? 63 : 66;
                                break;

                            case 63:
                                key = access ? 'positive' : 'negative';

                                if (!queryMaps[key].has(_collectionName)) {
                                    queryMaps[key].set(_collectionName, [permission.resourceId]);
                                } else {
                                    queryMaps[key].get(_collectionName).push(permission.resourceId);
                                }
                                return _context.abrupt('break', 66);

                            case 66:
                                queryRestrictionSet = true;

                            case 67:
                                _iteratorNormalCompletion5 = true;
                                _context.next = 57;
                                break;

                            case 70:
                                _context.next = 76;
                                break;

                            case 72:
                                _context.prev = 72;
                                _context.t2 = _context['catch'](55);
                                _didIteratorError5 = true;
                                _iteratorError5 = _context.t2;

                            case 76:
                                _context.prev = 76;
                                _context.prev = 77;

                                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                                    _iterator5.return();
                                }

                            case 79:
                                _context.prev = 79;

                                if (!_didIteratorError5) {
                                    _context.next = 82;
                                    break;
                                }

                                throw _iteratorError5;

                            case 82:
                                return _context.finish(79);

                            case 83:
                                return _context.finish(76);

                            case 84:
                                _context.next = 91;
                                break;

                            case 86:
                                path = this.getShortestPath(queriedCollection, collection);

                                if (path.length) {
                                    _context.next = 89;
                                    break;
                                }

                                throw new Error(errorMessageHeader + ', as there is no path between ' + ('collections ' + queriedCollection.def.name + ' and ' + _collectionName + ' in the schema.'));

                            case 89:
                                pathCollectionName = void 0;

                                while (pathCollectionName = path.pop()) {
                                    pathCollection = Tyr.byName[pathCollectionName];
                                }

                            case 91:
                                if (queryRestrictionSet) {
                                    _context.next = 93;
                                    break;
                                }

                                throw new Error(errorMessageHeader + ', unable to set query restriction ' + ('to satisfy permissions relating to collection ' + _collectionName));

                            case 93:
                                _iteratorNormalCompletion4 = true;
                                _context.next = 44;
                                break;

                            case 96:
                                _context.next = 102;
                                break;

                            case 98:
                                _context.prev = 98;
                                _context.t3 = _context['catch'](42);
                                _didIteratorError4 = true;
                                _iteratorError4 = _context.t3;

                            case 102:
                                _context.prev = 102;
                                _context.prev = 103;

                                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                                    _iterator4.return();
                                }

                            case 105:
                                _context.prev = 105;

                                if (!_didIteratorError4) {
                                    _context.next = 108;
                                    break;
                                }

                                throw _iteratorError4;

                            case 108:
                                return _context.finish(105);

                            case 109:
                                return _context.finish(102);

                            case 110:
                                return _context.abrupt('return', {
                                    $and: [createInQueries(queryMaps['positive'], queriedCollection, '$in'), createInQueries(queryMaps['negative'], queriedCollection, '$nin')]
                                });

                            case 111:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[20, 24, 28, 36], [29,, 31, 35], [42, 98, 102, 110], [55, 72, 76, 84], [77,, 79, 83], [103,, 105, 109]]);
            }));
        }
    }], [{
        key: 'makeRepository',
        value: function makeRepository(collection) {
            return {
                getEntity: function getEntity(id) {
                    return __awaiter(this, void 0, Promise, regeneratorRuntime.mark(function _callee2() {
                        return regeneratorRuntime.wrap(function _callee2$(_context2) {
                            while (1) {
                                switch (_context2.prev = _context2.next) {
                                    case 0:
                                        _context2.t0 = collection;
                                        _context2.next = 3;
                                        return collection.byId(id);

                                    case 3:
                                        _context2.t1 = _context2.sent;
                                        _context2.next = 6;
                                        return _context2.t0.populate.call(_context2.t0, 'permissions', _context2.t1);

                                    case 6:
                                        return _context2.abrupt('return', _context2.sent);

                                    case 7:
                                    case 'end':
                                        return _context2.stop();
                                }
                            }
                        }, _callee2, this);
                    }));
                },
                saveEntity: function saveEntity(id, doc) {
                    return __awaiter(this, void 0, Promise, regeneratorRuntime.mark(function _callee3() {
                        return regeneratorRuntime.wrap(function _callee3$(_context3) {
                            while (1) {
                                switch (_context3.prev = _context3.next) {
                                    case 0:
                                        _context3.next = 2;
                                        return PermissionsModel_1.PermissionsModel.updatePermissions(doc, 'subject');

                                    case 2:
                                        _context3.next = 4;
                                        return doc.$save();

                                    case 4:
                                        return _context3.abrupt('return', _context3.sent);

                                    case 5:
                                    case 'end':
                                        return _context3.stop();
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