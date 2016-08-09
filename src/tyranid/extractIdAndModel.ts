import Tyr from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';

const checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');


export function validate(plugin: GraclPlugin, uid: string) {
  try {
    const components: { [key: string]: any } = Tyr.parseUid(uid) || {};
  } catch (err) {
    if (/must be a single String of 12 bytes or a string of 24 hex characters/.test(err.message)) {
      plugin.error(`Invalid resource id: ${uid}`);
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
      $model: <Tyr.CollectionInstance> components['collection']
    };
  } else {
    validate(plugin, doc.$uid);
    return {
      $uid: <string> doc.$uid,
      $model: doc.$model
    };
  }
}
