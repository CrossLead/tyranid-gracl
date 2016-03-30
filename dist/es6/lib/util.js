"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const tyranid_1 = require('tyranid');
const _ = require('lodash');
const gracl = require('gracl');
exports.getCollectionLinksSorted = (function () {
    const defaultOpts = { direction: 'outgoing' };
    const fn = function getCollectionLinksSorted(col, opts = defaultOpts) {
        const collectionFieldCache = fn.cache, hash = `${col.def.name}:${_.pairs(opts).map(e => e.join('=')).sort().join(':')}`;
        if (collectionFieldCache[hash])
            return collectionFieldCache[hash];
        const links = _.sortBy(col.links(opts), field => field.link.def.name);
        return collectionFieldCache[hash] = links;
    };
    fn.cache = {};
    return fn;
})();
function compareCollectionWithField(aCol, bCol) {
    const a = aCol.def.name, b = bCol.link.def.name;
    return gracl.baseCompare(a, b);
}
exports.compareCollectionWithField = compareCollectionWithField;
function findLinkInCollection(col, linkCollection) {
    const links = exports.getCollectionLinksSorted(col), index = gracl.binaryIndexOf(links, linkCollection, compareCollectionWithField);
    return links[index];
}
exports.findLinkInCollection = findLinkInCollection;
function createInQueries(map, queriedCollection, key) {
    if (!(key === '$in' || key === '$nin')) {
        throw new TypeError(`key must be $nin or $in!`);
    }
    const conditions = [];
    for (const [col, idSet] of map.entries()) {
        let prop;
        if (col === queriedCollection.def.name) {
            prop = queriedCollection.def.primaryKey.field;
        }
        else {
            const link = findLinkInCollection(queriedCollection, tyranid_1.default.byName[col]);
            if (!link) {
                throw new Error(`No outgoing link from ${queriedCollection.def.name} to ${col}, cannot create restricted ${key} clause!`);
            }
            prop = link.spath;
        }
        conditions.push({ [prop]: { [key]: [...idSet] } });
    }
    return { [key === '$in' ? '$or' : '$and']: conditions };
}
exports.createInQueries = createInQueries;
;
function stepThroughCollectionPath(ids, previousCollection, nextCollection, secure = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const nextCollectionLinkField = findLinkInCollection(nextCollection, previousCollection);
        if (!nextCollectionLinkField) {
            throw new Error(`cannot step through collection path, as no link to collection ${nextCollection.def.name} ` +
                `from collection ${previousCollection.def.name}`);
        }
        const nextCollectionId = nextCollection.def.primaryKey.field;
        const nextCollectionDocs = yield nextCollection.findAll({ [nextCollectionLinkField.spath]: { $in: ids } }, { _id: 1, [nextCollectionId]: 1 }, { tyranid: { secure: secure } });
        return _.map(nextCollectionDocs, nextCollectionId);
    });
}
exports.stepThroughCollectionPath = stepThroughCollectionPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBLDBCQUFnQixTQUFTLENBQUMsQ0FBQTtBQUMxQixNQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixNQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQWlCbEIsZ0NBQXdCLEdBQUcsQ0FBQztJQVF2QyxNQUFNLFdBQVcsR0FBRyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQztJQUc5QyxNQUFNLEVBQUUsR0FBYyxrQ0FDWSxHQUEyQixFQUMzQixJQUFJLEdBQVEsV0FBVztRQUd2RCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQy9CLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFFdkYsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFHbEUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0RSxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzVDLENBQUMsQ0FBQztJQUVGLEVBQUUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ2Qs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