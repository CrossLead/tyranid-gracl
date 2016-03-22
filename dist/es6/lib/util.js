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
        const a = aCol.def.name, b = bCol.link.def.name;
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
        let prop;
        if (col === queriedCollection.def.name) {
            prop = queriedCollection.def.primaryKey.field;
        }
        else {
            const link = findLinkInCollection(queriedCollection, Tyr.byName[col]);
            prop = link.spath;
        }
        out[prop] = { [key]: [...uids] };
        return out;
    }, {});
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
        return _
            .chain(yield nextCollection.find({
            [nextCollectionLinkField.spath]: { $in: ids }
        }, null, { tyranid: { insecure: insecure } }))
            .map(nextCollection.def.primaryKey.field)
            .value();
    });
}
exports.stepThroughCollectionPath = stepThroughCollectionPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUVBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQy9CLE1BQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLE1BQVksS0FBSyxXQUFNLE9BQU8sQ0FBQyxDQUFBO0FBZWxCLGdDQUF3QixHQUFHLENBQUM7SUFRdkMsTUFBTSxFQUFFLEdBQWMsa0NBQ0osR0FBMkIsRUFDM0IsSUFBSSxHQUFRLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRTtRQUVyRCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQy9CLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFFdkYsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzVDLENBQUMsQ0FBQztJQUdGLEVBQUUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ2QsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNa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