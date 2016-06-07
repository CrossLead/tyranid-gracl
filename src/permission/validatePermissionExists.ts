import { GraclPlugin } from '../classes/GraclPlugin';
import { parsePermissionString } from './parsePermissionString';

export function validatePermissionExists(plugin: GraclPlugin, perm: string) {
  if (!perm) plugin.error('no permission given!');

  const components = parsePermissionString(plugin, perm);

  if (!(components.action && plugin.permissionHierarchy[components.action])) {
    plugin.error(`Invalid permission type: ${components.action}`);
  }

  if (components.collection && !plugin.graclHierarchy.resources.has(components.collection)) {
    plugin.error(
      `Collection "${components.collection}" has no ` +
      `resource class and thus can't be used with permission "${components.action}"`
    );
  }
}
