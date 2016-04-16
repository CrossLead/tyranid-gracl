import Tyr from 'tyranid';
import { createError } from './createError';

export function extractIdAndModel(doc: Tyr.Document | string) {
  if (typeof doc === 'string') {
    const components: { [key: string]: any } = Tyr.parseUid(doc) || {};
    if (!components['collection']) createError(`Invalid resource id: ${doc}`);
    return {
      $uid: <string> doc,
      $model: <Tyr.CollectionInstance> components['collection']
    };
  } else {
    return {
      $uid: <string> doc.$uid,
      $model: doc.$model
    };
  }
}
