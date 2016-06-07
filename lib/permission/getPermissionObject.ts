import { GraclPlugin } from '../classes/GraclPlugin';
import { permissionType } from '../interfaces';

export function getPermissionObject(plugin: GraclPlugin, permissionString: string): permissionType {
  return plugin.permissionHierarchy[
    plugin.parsePermissionString(permissionString).action || ''
  ];
}
