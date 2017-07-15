import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { documentMethods } from './documentMethods';

/**
 * Add methods to the tyranid document prototype
 * so permissions checks can be done directly from documents
 */
export function mixInDocumentMethods(plugin: GraclPlugin) {
  const tyranidDocumentPrototype = <{
    [key: string]: any;
  }>Tyr.documentPrototype;

  plugin.log(`mixing in document methods...`);

  for (const method in documentMethods) {
    if (documentMethods.hasOwnProperty(method)) {
      if (tyranidDocumentPrototype[method]) {
        plugin.error(
          `tried to set method ${method} on document prototype, but it already exists!`
        );
      }
      tyranidDocumentPrototype[method] = (<any>documentMethods)[method];
    }
  }
}
