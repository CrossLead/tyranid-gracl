"use strict";

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

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
    var fn = function getCollectionLinksSorted(col) {
        var opts = arguments.length <= 1 || arguments[1] === undefined ? { direction: 'outgoing' } : arguments[1];

        var collectionFieldCache = fn.cache,
            hash = col.def.name + ':' + _.pairs(opts).map(function (e) {
            return e.join('=');
        }).sort().join(':');
        if (collectionFieldCache[hash]) return collectionFieldCache[hash];
        var links = _.sortBy(col.links(opts), function (link) {
            return link.collection.def.name;
        });
        return collectionFieldCache[hash] = links;
    };
    fn.cache = {};
    return fn;
}();
function findLinkInCollection(col, linkCollection) {
    var links = exports.getCollectionLinksSorted(col),
        index = gracl.binaryIndexOf(links, linkCollection, function (aCol, bCol) {
        var a = aCol.def.name,
            b = bCol.link.def.name;
        return gracl.baseCompare(a, b);
    });
    return index >= 0 ? links[index] : undefined;
}
exports.findLinkInCollection = findLinkInCollection;
function createInQueries(map, queriedCollection, key) {
    return (0, _from2.default)(map.entries()).reduce(function (out, _ref) {
        var _ref2 = (0, _slicedToArray3.default)(_ref, 2);

        var col = _ref2[0];
        var uids = _ref2[1];

        var prop = void 0;
        if (col === queriedCollection.def.name) {
            prop = queriedCollection.def.primaryKey.field;
        } else {
            var link = findLinkInCollection(queriedCollection, Tyr.byName[col]);
            prop = link.spath;
        }
        out[prop] = (0, _defineProperty3.default)({}, key, [].concat((0, _toConsumableArray3.default)(uids)));
        return out;
    }, {});
}
exports.createInQueries = createInQueries;
;
function stepThroughCollectionPath(ids, previousCollection, nextCollection) {
    var insecure = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

    return __awaiter(this, void 0, void 0, _regenerator2.default.mark(function _callee() {
        var nextCollectionLinkField;
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
                        _context.t0 = _;
                        _context.next = 6;
                        return nextCollection.find((0, _defineProperty3.default)({}, nextCollectionLinkField.spath, { $in: ids }), null, { tyranid: { insecure: insecure } });

                    case 6:
                        _context.t1 = _context.sent;
                        _context.t2 = nextCollection.def.primaryKey.field;
                        return _context.abrupt('return', _context.t0.chain.call(_context.t0, _context.t1).map(_context.t2).value());

                    case 9:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));
}
exports.stepThroughCollectionPath = stepThroughCollectionPath;