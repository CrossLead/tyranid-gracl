import { GraclPlugin } from '../';

export function getAllowedPermissionsForCollection(collectionName: string) {
  const plugin = <GraclPlugin> this;
  if (plugin.permissionRestrictions.has(collectionName)) {
    return [...plugin.permissionRestrictions.get(collectionName)];
  }
  return [...plugin.setOfAllPermissions];
}
