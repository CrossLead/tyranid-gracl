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
const Tyr = require('tyranid');
const _ = require('lodash');
const gracl = require('gracl');
exports.getCollectionLinksSorted = function () {
    const defaultOpts = { direction: 'outgoing' };
    const fn = function getCollectionLinksSorted(col) {
        let opts = arguments.length <= 1 || arguments[1] === undefined ? defaultOpts : arguments[1];

        const collectionFieldCache = fn.cache,
              hash = `${ col.def.name }:${ _.pairs(opts).map(e => e.join('=')).sort().join(':') }`;
        if (collectionFieldCache[hash]) return collectionFieldCache[hash];
        const links = _.sortBy(col.links(opts), field => field.link.def.name);
        return collectionFieldCache[hash] = links;
    };
    fn.cache = {};
    return fn;
}();
function compareCollectionWithField(aCol, bCol) {
    const a = aCol.def.name,
          b = bCol.link.def.name;
    return gracl.baseCompare(a, b);
}
exports.compareCollectionWithField = compareCollectionWithField;
function findLinkInCollection(col, linkCollection) {
    const links = exports.getCollectionLinksSorted(col),
          index = gracl.binaryIndexOf(links, linkCollection, compareCollectionWithField);
    return index >= 0 ? links[index] : undefined;
}
exports.findLinkInCollection = findLinkInCollection;
function createInQueries(map, queriedCollection, key) {
    const query = {};
    for (const _ref of map.entries()) {
        var _ref2 = _slicedToArray(_ref, 2);

        const col = _ref2[0];
        const uids = _ref2[1];

        let prop;
        if (col === queriedCollection.def.name) {
            prop = queriedCollection.def.primaryKey.field;
        } else {
            const link = findLinkInCollection(queriedCollection, Tyr.byName[col]);
            prop = link.spath;
        }
        query[prop] = { [key]: [].concat(_toConsumableArray(uids)) };
    }
    return query;
}
exports.createInQueries = createInQueries;
;
function stepThroughCollectionPath(ids, previousCollection, nextCollection) {
    let insecure = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

    return __awaiter(this, void 0, void 0, function* () {
        const nextCollectionLinkField = findLinkInCollection(nextCollection, previousCollection);
        if (!nextCollectionLinkField) {
            throw new Error(`cannot step through collection path, as no link to collection ${ nextCollection.def.name } ` + `from collection ${ previousCollection.def.name }`);
        }
        const nextCollectionId = nextCollection.def.primaryKey.field;
        const nextCollectionDocs = yield nextCollection.find({ [nextCollectionLinkField.spath]: { $in: ids } }, { _id: 1, [nextCollectionId]: 1 }, { tyranid: { insecure: insecure } });
        return _.map(nextCollectionDocs, nextCollectionId);
    });
}
exports.stepThroughCollectionPath = stepThroughCollectionPath;