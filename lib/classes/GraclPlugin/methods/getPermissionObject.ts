import { GraclPlugin } from '../';
import { permissionType } from '../../../interfaces';

export function getPermissionObject(permissionString: string): permissionType {
  const plugin = <GraclPlugin> this;
  return plugin.permissionHierarchy[
    plugin.parsePermissionString(permissionString).action || ''
  ];
}
