import { GraclPlugin } from '../';


export function validatePermissionExists(perm: string) {
  const plugin = <GraclPlugin> this;
  if (!perm) plugin.error('no permission given!');

  const components = plugin.parsePermissionString(perm);

  if (!plugin.permissionHierarchy[components.action]) {
    plugin.error(`Invalid permission type: ${components.action}`);
  }

  if (components.collection && !plugin.graclHierarchy.resources.has(components.collection)) {
    plugin.error(
      `Collection "${components.collection}" has no ` +
      `resource class and thus can't be used with permission "${components.action}"`
    );
  }
}
