import { GraclPlugin } from '../';

export function getAllowedPermissionsForCollection(collectionName: string) {
  const plugin = <GraclPlugin> this;
  const restriction = plugin.permissionRestrictions.get(collectionName);
  if (restriction) {
    return [...restriction];
  } else {
    return [...plugin.setOfAllPermissions];
  }
}
