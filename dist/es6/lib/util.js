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
    return (index >= 0)
        ? links[index]
        : undefined;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUVBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQy9CLE1BQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLE1BQVksS0FBSyxXQUFNLE9BQU8sQ0FBQyxDQUFBO0FBZWxCLGdDQUF3QixHQUFHLENBQUM7SUFRdkMsTUFBTSxXQUFXLEdBQUcsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLENBQUM7SUFHOUMsTUFBTSxFQUFFLEdBQWMsa0NBQ2xCLEdBQTJCLEVBQzNCLElBQUksR0FBUSxXQUFXO1FBR3pCLE1BQU0sb0JBQW9CLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFDL0IsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUV2RixFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUdsRSxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRFLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDNUMsQ0FBQyxDQUFDO0lBR0YsRUFBRSxDQUFDLEtBQUssR0FBRyxFQUFFLENB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