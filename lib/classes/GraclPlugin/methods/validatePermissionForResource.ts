import Tyr from 'tyranid';
import { GraclPlugin } from '../';

export function validatePermissionForResource(permissionString: string, resourceCollection: Tyr.CollectionInstance) {
  const plugin = <GraclPlugin> this,
        name = resourceCollection.def.name;

  if (plugin.isCrudPermission(permissionString)) {
    plugin.error(
      `Cannot use raw crud permission "${permissionString}" ` +
      `without attached resource. Did you mean ${plugin.formatPermissionType({
        collection: name,
        action: plugin.parsePermissionString(permissionString).action
      })}?`
    );
  }

  plugin.validateAsResource(resourceCollection);
  plugin.validatePermissionExists(permissionString);

  if (plugin.permissionRestrictions.has(name)) {
    if (!plugin.permissionRestrictions.get(name).has(permissionString)) {
      plugin.error(
        `Tried to use permission "${permissionString}" with collection "${name}" ` +
        `but "${name}" is restricted to the following permissions: ` + (
          [...plugin.permissionRestrictions.get(name).values()].join(', ')
        )
      );
    }
  }
}
