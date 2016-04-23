import Tyr from 'tyranid';
import { GraclPlugin } from '../';
import { documentMethods } from '../../../documentMethods';

export function mixInDocumentMethods() {
  const plugin = <GraclPlugin> this;
  const tyranidDocumentPrototype = <{ [key: string]: any }> Tyr.documentPrototype;

  plugin.log(`mixing in document methods...`);

  for (const method in documentMethods) {
    if (documentMethods.hasOwnProperty(method)) {
      if (tyranidDocumentPrototype[method]) {
        plugin.error(
          `tried to set method ${method} on document prototype, but it already exists!`
        );
      }
      tyranidDocumentPrototype[method] = (<any> documentMethods)[method];
    }
  }
}
