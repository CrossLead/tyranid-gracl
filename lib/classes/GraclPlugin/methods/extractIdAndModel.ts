import Tyr from 'tyranid';
import { GraclPlugin } from '../';

export function extractIdAndModel(doc: Tyr.Document | string) {
  const plugin = <GraclPlugin> this;
  if (typeof doc === 'string') {
    const components: { [key: string]: any } = Tyr.parseUid(doc) || {};
    if (!components['collection']) plugin.error(`Invalid resource id: ${doc}`);
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
