import { GraclPlugin } from '../classes/GraclPlugin';
import { parsePermissionString } from './parsePermissionString';
import { getPermissionObject } from './getPermissionObject';


export function isCrudPermission(plugin: GraclPlugin, permissionString: string) {
  const components = parsePermissionString(plugin, permissionString);
  const perm = getPermissionObject(plugin, permissionString);
  return !components.collection
    && perm
    && !perm.abstract
    && !perm.collection;
}
