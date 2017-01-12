import { Tyr } from 'tyranid';
import * as _ from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';

/**
 * Get a list of all links in a given collection schema,
 * sorted by the name of the linked collection -- cached
 */
export function getCollectionLinksSorted(
  plugin: GraclPlugin,
  col: Tyr.GenericCollection,
  opts: any = { direction: 'outgoing' }
): Tyr.FieldInstance[] {
  const collectionFieldCache = plugin._sortedLinkCache,
    hash = `${col.def.name}:${_
      .toPairs(opts)
      .map(e => e.join('='))
      .sort()
      .join(':')}`;

  if (collectionFieldCache[hash])
    return collectionFieldCache[hash];

  // sort fields by link collection name
  const links = _.sortBy(col.links(opts), field => field.link.def.name);

  return collectionFieldCache[hash] = links;
}
