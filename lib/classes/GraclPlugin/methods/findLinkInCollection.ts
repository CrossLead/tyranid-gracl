import Tyr from 'tyranid';
import { binaryIndexOf } from 'gracl';
import { GraclPlugin } from '../';


/**
 *  Function to find if <linkCollection> appears on an outgoing link field
    on <col>, uses memoized <getCollectionFieldSorted> for O(1) field lookup
    and binary search for feild search => O(log(n)) lookup
 */
export function findLinkInCollection(
  col: Tyr.CollectionInstance,
  linkCollection: Tyr.CollectionInstance
): Tyr.Field {
  const plugin = <GraclPlugin> this,
        links = plugin.getCollectionLinksSorted(col),
        index = binaryIndexOf(links, linkCollection, plugin.compareCollectionWithField);

  return links[index];
}
