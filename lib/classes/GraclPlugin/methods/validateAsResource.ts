import Tyr from 'tyranid';
import { GraclPlugin } from '../';

export function validateAsResource(collection: Tyr.CollectionInstance) {
  const plugin = <GraclPlugin> this;

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
