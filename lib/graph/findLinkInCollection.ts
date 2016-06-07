import Tyr from 'tyranid';
import { binaryIndexOf } from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
import { compareCollectionWithField } from '../util/compareCollectionWithField';
import { getCollectionLinksSorted } from './getCollectionLinksSorted';

/**
 *  Function to find if <linkCollection> appears on an outgoing link field
    on <col>, uses memoized <getCollectionFieldSorted> for O(1) field lookup
    and binary search for feild search => O(log(n)) lookup
 */
export function findLinkInCollection(
  plugin: GraclPlugin,
  col: Tyr.CollectionInstance,
  linkCollection: Tyr.CollectionInstance
): Tyr.Field {
  const links = getCollectionLinksSorted(plugin, col),
        index = binaryIndexOf(links, linkCollection, compareCollectionWithField);

  return links[index];
}
