import { GraclPlugin } from '../classes/GraclPlugin';
import { PermissionType } from '../interfaces';

// get the original supplied permissions object passed to the
// plugin on instantiation
export function getPermissionObject(
  plugin: GraclPlugin,
  permissionString: string
): PermissionType {
  return plugin.permissionHierarchy[
    plugin.parsePermissionString(permissionString).action || ''
  ];
}
