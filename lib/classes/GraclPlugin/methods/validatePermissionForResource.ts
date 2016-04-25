import Tyr from 'tyranid';
import { GraclPlugin } from '../';

export function validatePermissionForResource(permissionString: string, resourceCollection: Tyr.CollectionInstance) {
  const plugin = <GraclPlugin> this,
        name = resourceCollection.def.name;

  if (plugin.isCrudPermission(permissionString)) {

    const action = plugin.parsePermissionString(permissionString).action;
    const formatted = !action
      ? permissionString
      : plugin.formatPermissionType({
        collection: name,
        action: action
      });

    plugin.error(
      `Cannot use raw crud permission "${permissionString}" ` +
      `without attached resource. Did you mean ${formatted}?`
    );
  }

  plugin.validateAsResource(resourceCollection);
  plugin.validatePermissionExists(permissionString);

  const restrictions = plugin.permissionRestrictions.get(name);
  if (restrictions) {
    if (!restrictions.has(permissionString)) {
      plugin.error(
        `Tried to use permission "${permissionString}" with collection "${name}" ` +
        `but "${name}" is restricted to the following permissions: ` + (
          [...restrictions.values()].join(', ')
        )
      );
    }
  }
}
