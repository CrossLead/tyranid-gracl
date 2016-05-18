import Tyr from 'tyranid';
import { GraclPlugin } from '../';

const checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");


function validate(uid: string, plugin: GraclPlugin) {
  try {
    const components: { [key: string]: any } = Tyr.parseUid(uid) || {};
    if (!components['collection'] ||
        !checkForHexRegExp.test((components['id'] || '').toString())) {
      plugin.error(`Invalid resource id: ${uid}`);
    }
  } catch (err) {
    if (/must be a single String of 12 bytes or a string of 24 hex characters/.test(err.message)) {
      plugin.error(`Invalid resource id: ${uid}`);
    }
    throw err;
  }
}


export function extractIdAndModel(doc: Tyr.Document | string) {
  const plugin = <GraclPlugin> this;

  if (typeof doc === 'string') {
    validate(doc, plugin);
    const components: { [key: string]: any } = Tyr.parseUid(doc) || {};
    return {
      $uid: <string> doc,
      $model: <Tyr.CollectionInstance> components['collection']
    };
  } else {
    validate(doc.$uid, plugin);
    return {
      $uid: <string> doc.$uid,
      $model: doc.$model
    };
  }
}
