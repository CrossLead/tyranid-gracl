import Tyr from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { Hash } from '../interfaces';
import { findLinkInCollection } from '../graph/findLinkInCollection';

/**
 * Convert a map of collections => { uids } into a mongo $in/$nin query
 *
 * used in query.ts to create the larger query used to filter db calls
 */
export function createInQueries(
  plugin: GraclPlugin,
  map: Map<string, Set<string>>,
  queriedCollection: Tyr.CollectionInstance,
  key: '$nin' | '$in'
): Hash<Hash<Hash<string[]>>[]> {
  if (!(key === '$in' || key === '$nin')) {
    plugin.error(`key must be $nin or $in!`);
  }

  const conditions: Hash<Hash<string[]>>[] = [];

  map.forEach((idSet, col) => {
    // if the collection is the same as the one being queried, use the primary id field
    let prop: string;
    if (col === queriedCollection.def.name) {
      const primaryKey = queriedCollection.def.primaryKey;
      if (!primaryKey) {
        plugin.error(`No primary key for collection ${queriedCollection.def.name}`);
      } else {
        prop = primaryKey.field;
      }
    } else {
      const link = findLinkInCollection(plugin, queriedCollection, Tyr.byName[col]);

      if (!link) {
        plugin.error(
          `No outgoing link from ${queriedCollection.def.name} to ${col}, cannot create restricted ${key} clause!`
        );
      }

      prop = link.spath;
    }

    conditions.push({ [<string> prop]: { [<string> key]: Array.from(idSet) } });
  });


  return { [key === '$in' ? '$or' : '$and']: conditions };
}
