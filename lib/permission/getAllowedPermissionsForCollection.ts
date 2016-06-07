import { GraclPlugin } from '../classes/GraclPlugin';

export function getAllowedPermissionsForCollection(plugin: GraclPlugin, collectionName: string) {
  const restriction = plugin.permissionRestrictions.get(collectionName);
  if (restriction) {
    return [...restriction];
  } else {
    return [...plugin.setOfAllPermissions];
  }
}
