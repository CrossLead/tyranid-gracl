import Tyr from 'tyranid';
import * as _ from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';

export function getCollectionLinksSorted(
  plugin: GraclPlugin,
  col: Tyr.CollectionInstance,
  opts: any = { direction: 'outgoing' }
): Tyr.Field[] {
  const collectionFieldCache = plugin._sortedLinkCache,
        hash = `${col.def.name}:${_.pairs(opts).map(e => e.join('=')).sort().join(':')}`;

  if (collectionFieldCache[hash]) return collectionFieldCache[hash];

  // sort fields by link collection name
  const links = _.sortBy(col.links(opts), field => field.link.def.name);

  return collectionFieldCache[hash] = links;
}
