import Tyr from 'tyranid';
import { Hash } from '../interfaces';
import * as _ from 'lodash';

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

  const defaultOpts = { direction: 'outgoing' };

  // create and cast function
  const fn = <memoized> function getCollectionLinksSorted(
                                    col: Tyr.CollectionInstance,
                                    opts: any = defaultOpts
                                  ): Tyr.Field[] {

    const collectionFieldCache = fn.cache,
          hash = `${col.def.name}:${_.pairs(opts).map(e => e.join('=')).sort().join(':')}`;

    if (collectionFieldCache[hash]) return collectionFieldCache[hash];

    // sort fields by link collection name
    const links = _.sortBy(col.links(opts), field => field.link.def.name);

    return collectionFieldCache[hash] = links;
  };

  fn.cache = {};
  return fn;
})();
