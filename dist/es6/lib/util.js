"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Tyr = require('tyranid');
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
    for (const [col, uids] of map.entries()) {
        let prop;
        if (col === queriedCollection.def.name) {
            prop = queriedCollection.def.primaryKey.field;
        }
        else {
            const link = findLinkInCollection(queriedCollection, Tyr.byName[col]);
            if (!link) {
                throw new Error(`No outgoing link from ${queriedCollection.def.name} to ${col}, cannot create restricted ${key} clause!`);
            }
            prop = link.spath;
        }
        conditions.push({ [prop]: { [key]: [...uids] } });
    }
    return { [key === '$in' ? '$or' : '$and']: conditions };
}
exports.createInQueries = createInQueries;
;
function stepThroughCollectionPath(ids, previousCollection, nextCollection, insecure = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const nextCollectionLinkField = findLinkInCollection(nextCollection, previousCollection);
        if (!nextCollectionLinkField) {
            throw new Error(`cannot step through collection path, as no link to collection ${nextCollection.def.name} ` +
                `from collection ${previousCollection.def.name}`);
        }
        const nextCollectionId = nextCollection.def.primaryKey.field;
        const nextCollectionDocs = yield nextCollection.find({ [nextCollectionLinkField.spath]: { $in: ids } }, { _id: 1, [nextCollectionId]: 1 }, { tyranid: { insecure: insecure } });
        return _.map(nextCollectionDocs, nextCollectionId);
    });
}
exports.stepThroughCollectionPath = stepThroughCollectionPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQy9CLE1BQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLE1BQVksS0FBSyxXQUFNLE9BQU8sQ0FBQyxDQUFBO0FBaUJsQixnQ0FBd0IsR0FBRyxDQUFDO0lBUXZDLE1BQU0sV0FBVyxHQUFHLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxDQUFDO0lBRzlDLE1BQU0sRUFBRSxHQUFjLGtDQUNZLEdBQTJCLEVBQzNCLElBQUksR0FBUSxXQUFXO1FBR3ZELE1BQU0sb0JBQW9CLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFDL0IsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUV2RixFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUdsRSxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRFLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDNUMsQ0FBQyxDQUFDO0lBRUYsRUFBRSxDQUFDLEtBQUssR0FBRyxFQUFFLENB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