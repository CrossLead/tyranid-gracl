import Tyr from 'tyranid';
import { GraclPlugin } from '../';
import { Hash } from '../../../interfaces';


export function createInQueries(
  map: Map<string, Set<string>>,
  queriedCollection: Tyr.CollectionInstance,
  key: '$nin' | '$in'
): Hash<Hash<Hash<string[]>>[]> {
  const plugin = <GraclPlugin> this;

  if (!(key === '$in' || key === '$nin')) {
    plugin.error(`key must be $nin or $in!`);
  }

  const conditions: Hash<Hash<string[]>>[] = [];

  for (const [col, idSet] of map.entries()) {
    // if the collection is the same as the one being queried, use the primary id field
    let prop: string;
    if (col === queriedCollection.def.name) {
      prop = queriedCollection.def.primaryKey.field;
    } else {
      const link = plugin.findLinkInCollection(queriedCollection, Tyr.byName[col]);

      if (!link) {
        plugin.error(
          `No outgoing link from ${queriedCollection.def.name} to ${col}, cannot create restricted ${key} clause!`
        );
      }

      prop = link.spath;
    }

    conditions.push({ [<string> prop]: { [<string> key]: [...idSet] } });
  }

  return { [key === '$in' ? '$or' : '$and']: conditions };
}
