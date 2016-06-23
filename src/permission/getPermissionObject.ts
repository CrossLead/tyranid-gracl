import { GraclPlugin } from '../classes/GraclPlugin';
import { permissionType } from '../interfaces';


// get the original supplied permissions object passed to the
// plugin on instantiation
export function getPermissionObject(plugin: GraclPlugin, permissionString: string): permissionType {
  return plugin.permissionHierarchy[
    plugin.parsePermissionString(permissionString).action || ''
  ];
}
