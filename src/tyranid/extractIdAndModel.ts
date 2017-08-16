import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';


export function validate(plugin: GraclPlugin, uid: string) {
  try {
    Tyr.parseUid(uid);
  } catch (err) {
    if (/must be a single String of 12 bytes or a string of 24 hex characters/.test(err.message)) {
      plugin.error(`Invalid uid: ${uid}`);
    }
    throw err;
  }
}


export function extractIdAndModel(plugin: GraclPlugin, doc: Tyr.Document | string) {
  if (typeof doc === 'string') {
    validate(plugin, doc);
    const components: { [key: string]: any } = Tyr.parseUid(doc) || {};
    return {
      $uid: <string> doc,
      $model: <Tyr.GenericCollection> components['collection']
    };
  } else {
    validate(plugin, doc.$uid);
    return {
      $uid: <string> doc.$uid,
      $model: doc.$model
    };
  }
}
