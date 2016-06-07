import Tyr from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';

export function validateAsResource(plugin: GraclPlugin, collection: Tyr.CollectionInstance) {
  if (!collection) {
    plugin.error(`Attempted to validate undefined collection!`);
  }

  if (!plugin.graclHierarchy.resources.has(collection.def.name)) {
    plugin.error(
      `Attempted to set/get permission using ${collection.def.name} as resource, ` +
      `no relevant resource class found in tyranid-gracl plugin!`
    );
  }
}
