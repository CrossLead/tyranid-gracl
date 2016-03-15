/// <reference path='../typings/main.d.ts' />

import * as Tyr from 'tyranid';
import * as _ from 'lodash';
import * as gracl from 'gracl';


/**
 *  parametric type for arbitrary string-keyed objects
 */
export type Hash<T> = {
  [key: string]: T;
};


/**
 *  Memoized function to find links for a given collection
    and sort them by the collection name
 */
export const getCollectionLinksSorted = (function() {
  // need to cast function to special memoized type to allow the cache property
  type memoized = {
    (col: Tyr.CollectionInstance, opts?: any): Tyr.Field[];
    cache: Hash<Tyr.Field[]>;
  };

  // create and cast function
  const fn = <memoized> function getCollectionLinksSorted(
                    col: Tyr.CollectionInstance,
                    opts: any = { direction: 'outgoing' }
                  ): Array<Tyr.Field> {
    const collectionFieldCache = fn.cache,
          hash = `${col.def.name}:${_.pairs(opts).map(e => e.join('=')).sort().join(':')}`;

    if (collectionFieldCache[hash]) return collectionFieldCache[hash];
    const links = _.sortBy(col.links(opts), link => link.collection.def.name);
    return collectionFieldCache[hash] = links;
  };

  // add cache
  fn.cache = {};
  return fn;
})();


/**
 *  Function to find if <linkCollection> appears on an outgoing link field
    on <col>, uses memoized <getCollectionFieldSorted> for O(1) field lookup
    and binary search for feild search => O(log(n)) lookup
 */
export function findLinkInCollection(col: Tyr.CollectionInstance, linkCollection: Tyr.CollectionInstance): Tyr.Field {
  const links = getCollectionLinksSorted(col),
        index = gracl.binaryIndexOf(links, linkCollection, (aCol: Tyr.CollectionInstance, bCol: Tyr.Field) => {
          const a = aCol.def.name,
                b = bCol.collection.def.name;
          return gracl.baseCompare(a, b);
        });

  return (index >= 0)
    ? links[index]
    : undefined;
}


/**
 *  parametric type for arbitrary string-keyed objects
 */
export function createInQueries(
                  map: Map<string, Set<string>>,
                  queriedCollection: Tyr.CollectionInstance,
                  key: string
                ) {
  return Array.from(map.entries())
    .reduce((out: Hash<Hash<string[]>>, [col, uids]) => {
      // if the collection is the same as the one being queried, use the primary id field
      if (col === queriedCollection.def.name) {
        col = queriedCollection.def.primaryKey.field;
      }

      const collectionLinkField = _.find(col.fields({ direction: 'outgoing' }), field => {

      });

      out[col] = { [key]: [...uids].map((u: string) => Tyr.parseUid(u).id) };
      return out;
    }, {});
};



/**
 *  Given collections A and B and an array of object ids of documents from A (aIds),
    find the ids of all documents in B linked to A by <aIds>
 */
export async function stepThroughCollectionPath(
                        ids: string[],
                        previousCollection: Tyr.CollectionInstance,
                        nextCollection: Tyr.CollectionInstance
                      ) {

  // find the field in the current path collection which we need to get
  // for the ids of the next path collection
  const nextCollectionLinkField = findLinkInCollection(previousCollection, nextCollection);

  if (!nextCollectionLinkField) {
    throw new Error(
      `cannot step through collection path, as no link to collection ${nextCollection.def.name} ` +
      `from collection ${previousCollection.def.name}`
    );
  }

  return <string[]> _
    // get the objects in the second to last collection of the path using
    // the ids of the last collection in the path
    .chain(await nextCollection.find({
      [nextCollectionLinkField.spath]: { $in: ids }
    }))
    // extract their primary ids using the primary field
    .map(nextCollection.def.primaryKey.field)
    .value();
}
