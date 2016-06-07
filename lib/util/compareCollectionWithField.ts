import Tyr from 'tyranid';
import { baseCompare } from 'gracl';

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
