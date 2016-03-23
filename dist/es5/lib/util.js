"use strict";

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

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
var _ = require('lodash');
var gracl = require('gracl');
exports.getCollectionLinksSorted = function () {
    var defaultOpts = { direction: 'outgoing' };
    var fn = function getCollectionLinksSorted(col) {
        var opts = arguments.length <= 1 || arguments[1] === undefined ? defaultOpts : arguments[1];

        var collectionFieldCache = fn.cache,
            hash = col.def.name + ':' + _.pairs(opts).map(function (e) {
            return e.join('=');
        }).sort().join(':');
        if (collectionFieldCache[hash]) return collectionFieldCache[hash];
        var links = _.sortBy(col.links(opts), function (field) {
            return field.link.def.name;
        });
        return collectionFieldCache[hash] = links;
    };
    fn.cache = {};
    return fn;
}();
function compareCollectionWithField(aCol, bCol) {
    var a = aCol.def.name,
        b = bCol.link.def.name;
    return gracl.baseCompare(a, b);
}
exports.compareCollectionWithField = compareCollectionWithField;
function findLinkInCollection(col, linkCollection) {
    var links = exports.getCollectionLinksSorted(col),
        index = gracl.binaryIndexOf(links, linkCollection, compareCollectionWithField);
    return index >= 0 ? links[index] : undefined;
}
exports.findLinkInCollection = findLinkInCollection;
function createInQueries(map, queriedCollection, key) {
    var query = {};
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = (0, _getIterator3.default)(map.entries()), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = (0, _slicedToArray3.default)(_step.value, 2);

            var col = _step$value[0];
            var uids = _step$value[1];

            var prop = void 0;
            if (col === queriedCollection.def.name) {
                prop = queriedCollection.def.primaryKey.field;
            } else {
                var link = findLinkInCollection(queriedCollection, Tyr.byName[col]);
                prop = link.spath;
            }
            query[prop] = (0, _defineProperty3.default)({}, key, [].concat((0, _toConsumableArray3.default)(uids)));
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

    return query;
}
exports.createInQueries = createInQueries;
;
function stepThroughCollectionPath(ids, previousCollection, nextCollection) {
    var insecure = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

    return __awaiter(this, void 0, void 0, _regenerator2.default.mark(function _callee() {
        var nextCollectionLinkField, nextCollectionId, nextCollectionDocs;
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        nextCollectionLinkField = findLinkInCollection(nextCollection, previousCollection);

                        if (nextCollectionLinkField) {
                            _context.next = 3;
                            break;
                        }

                        throw new Error('cannot step through collection path, as no link to collection ' + nextCollection.def.name + ' ' + ('from collection ' + previousCollection.def.name));

                    case 3:
                        nextCollectionId = nextCollection.def.primaryKey.field;
                        _context.next = 6;
                        return nextCollection.find((0, _defineProperty3.default)({}, nextCollectionLinkField.spath, { $in: ids }), (0, _defineProperty3.default)({ _id: 1 }, nextCollectionId, 1), { tyranid: { insecure: insecure } });

                    case 6:
                        nextCollectionDocs = _context.sent;
                        return _context.abrupt('return', _.map(nextCollectionDocs, nextCollectionId));

                    case 8:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));
}
exports.stepThroughCollectionPath = stepThroughCollectionPath;