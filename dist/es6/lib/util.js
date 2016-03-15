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
    const fn = function getCollectionLinksSorted(col, opts = { direction: 'outgoing' }) {
        const collectionFieldCache = fn.cache, hash = `${col.def.name}:${_.pairs(opts).map(e => e.join('=')).sort().join(':')}`;
        if (collectionFieldCache[hash])
            return collectionFieldCache[hash];
        const links = _.sortBy(col.links(opts), link => link.collection.def.name);
        return collectionFieldCache[hash] = links;
    };
    fn.cache = {};
    return fn;
})();
function findLinkInCollection(col, linkCollection) {
    const links = exports.getCollectionLinksSorted(col), index = gracl.binaryIndexOf(links, linkCollection, (aCol, bCol) => {
        const a = aCol.def.name, b = bCol.collection.def.name;
        return gracl.baseCompare(a, b);
    });
    return (index >= 0)
        ? links[index]
        : undefined;
}
exports.findLinkInCollection = findLinkInCollection;
function createInQueries(map, queriedCollection, key) {
    return Array.from(map.entries())
        .reduce((out, [col, uids]) => {
        if (col === queriedCollection.def.name) {
            col = queriedCollection.def.primaryKey.field;
        }
        const collectionLinkField = _.find(col.fields({ direction: 'outgoing' }), field => {
        });
        out[col] = { [key]: [...uids].map((u) => Tyr.parseUid(u).id) };
        return out;
    }, {});
}
exports.createInQueries = createInQueries;
;
function stepThroughCollectionPath(ids, previousCollection, nextCollection) {
    return __awaiter(this, void 0, void 0, function* () {
        const nextCollectionLinkField = findLinkInCollection(previousCollection, nextCollection);
        if (!nextCollectionLinkField) {
            throw new Error(`cannot step through collection path, as no link to collection ${nextCollection.def.name} ` +
                `from collection ${previousCollection.def.name}`);
        }
        return _
            .chain(yield nextCollection.find({
            [nextCollectionLinkField.spath]: { $in: ids }
        }))
            .map(nextCollection.def.primaryKey.field)
            .value();
    });
}
exports.stepThroughCollectionPath = stepThroughCollectionPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUVBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQy9CLE1BQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLE1BQVksS0FBSyxXQUFNLE9BQU8sQ0FBQyxDQUFBO0FBZWxCLGdDQUF3QixHQUFHLENBQUM7SUFRdkMsTUFBTSxFQUFFLEdBQWMsa0NBQ0osR0FBMkIsRUFDM0IsSUFBSSxHQUFRLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRTtRQUVyRCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQy9CLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFFdkYsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzVDLENBQUMsQ0FBQztJQUdGLEVBQUUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ2QsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNa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