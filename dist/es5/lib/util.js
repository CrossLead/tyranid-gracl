"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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
            b = bCol.collection.def.name;
        return gracl.baseCompare(a, b);
    });
    return index >= 0 ? links[index] : undefined;
}
exports.findLinkInCollection = findLinkInCollection;
function createInQueries(map, queriedCollection, key) {
    return Array.from(map.entries()).reduce(function (out, _ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var col = _ref2[0];
        var uids = _ref2[1];

        if (col === queriedCollection.def.name) {
            col = queriedCollection.def.primaryKey.field;
        }
        var collectionLinkField = _.find(col.fields({ direction: 'outgoing' }), function (field) {});
        out[col] = _defineProperty({}, key, [].concat(_toConsumableArray(uids)).map(function (u) {
            return Tyr.parseUid(u).id;
        }));
        return out;
    }, {});
}
exports.createInQueries = createInQueries;
;
function stepThroughCollectionPath(ids, previousCollection, nextCollection) {
    return __awaiter(this, void 0, void 0, regeneratorRuntime.mark(function _callee() {
        var nextCollectionLinkField;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        nextCollectionLinkField = findLinkInCollection(previousCollection, nextCollection);

                        if (nextCollectionLinkField) {
                            _context.next = 3;
                            break;
                        }

                        throw new Error('cannot step through collection path, as no link to collection ' + nextCollection.def.name + ' ' + ('from collection ' + previousCollection.def.name));

                    case 3:
                        _context.t0 = _;
                        _context.next = 6;
                        return nextCollection.find(_defineProperty({}, nextCollectionLinkField.spath, { $in: ids }));

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