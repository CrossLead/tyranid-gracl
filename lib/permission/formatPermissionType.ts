import { GraclPlugin } from '../classes/GraclPlugin';

export function formatPermissionType(
  plugin: GraclPlugin,
  components: { action: string, collection?: string }
) {
  const hierarchyNode = plugin.permissionHierarchy[components.action];
  if (!hierarchyNode) {
    plugin.error(`Invalid permission type: ${components.action}`);
  }

  // if the permission is abstract, it should not be associated with
  // a specific collection, if there is a collection provided and it is not abstract, use it
  if (!hierarchyNode.abstract && components.collection) {
    return `${components.action}-${components.collection}`;
  }

  return components.action;
}
