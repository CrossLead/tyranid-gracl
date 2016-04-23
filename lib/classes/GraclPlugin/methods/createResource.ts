import Tyr from 'tyranid';
import { Resource } from 'gracl';
import { GraclPlugin } from '../';

export function createResource(resourceDocument: Tyr.Document): Resource {
  const plugin = <GraclPlugin> this;

  if (!(resourceDocument && resourceDocument.$uid)) {
    plugin.error('No resource document provided (or Tyr.local.user is unavailable)!');
  }

  const resourceCollectionName  = resourceDocument.$model.def.name,
        ResourceClass           = plugin.graclHierarchy.getResource(resourceCollectionName);

  if (!ResourceClass) {
    plugin.error(
      `Attempted to set/get permission using ${resourceCollectionName} as resource, ` +
      `no relevant resource class found in tyranid-gracl plugin!`
    );
  }

  return new ResourceClass(resourceDocument);
}
