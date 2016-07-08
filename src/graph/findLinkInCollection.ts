import Tyr from 'tyranid';
import { binaryIndexOf, baseCompare } from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
import { getCollectionLinksSorted } from './getCollectionLinksSorted';


function compareCollectionWithField(
  aCol: Tyr.CollectionInstance,
  bCol: Tyr.Field
) {

  const a = aCol.def.name,
        b = bCol.link.def.name;

  return baseCompare(a, b);
}


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