import { binaryIndexOf, baseCompare } from 'gracl';
import Tyr from 'tyranid';
import { getCollectionLinksSorted } from './getCollectionLinksSorted';

/**
 *  Compare a collection by name with a field by name
 */
export function compareCollectionWithField(
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
                  col: Tyr.CollectionInstance,
                  linkCollection: Tyr.CollectionInstance
                ): Tyr.Field {

  const links = getCollectionLinksSorted(col),
        index = binaryIndexOf(links, linkCollection, compareCollectionWithField);

  return links[index];
}
