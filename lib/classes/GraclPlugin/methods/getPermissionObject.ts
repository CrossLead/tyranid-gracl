import { GraclPlugin } from '../';

export function getPermissionObject(permissionString: string) {
  const plugin = <GraclPlugin> this;
  return plugin.permissionHierarchy[
    plugin.parsePermissionString(permissionString).action || ''
  ];
}
