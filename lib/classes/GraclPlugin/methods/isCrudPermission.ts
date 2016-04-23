import { GraclPlugin } from '../';


export function isCrudPermission(permissionString: string) {
  const plugin = <GraclPlugin> this;
  const components = plugin.parsePermissionString(permissionString);
  const perm = plugin.getPermissionObject(permissionString);
  return !components.collection
    && perm
    && !perm.abstract
    && !perm.collection;
}
