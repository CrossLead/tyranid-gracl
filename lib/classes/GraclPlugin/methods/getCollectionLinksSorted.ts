import Tyr from 'tyranid';
import * as _ from 'lodash';
import { GraclPlugin } from '../';

export function getCollectionLinksSorted(
  col: Tyr.CollectionInstance,
  opts: any = { direction: 'outgoing' }
): Tyr.Field[] {
  const plugin = <GraclPlugin> this,
        collectionFieldCache = plugin._sortedLinkCache,
        hash = `${col.def.name}:${_.pairs(opts).map(e => e.join('=')).sort().join(':')}`;

  if (collectionFieldCache[hash]) return collectionFieldCache[hash];

  // sort fields by link collection name
  const links = _.sortBy(col.links(opts), field => field.link.def.name);

  return collectionFieldCache[hash] = links;
}
