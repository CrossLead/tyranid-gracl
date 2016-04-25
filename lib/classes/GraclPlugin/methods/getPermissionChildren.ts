import * as _ from 'lodash';
import { GraclPlugin } from '../';

/**
 *  Get all children of a permission
 */
export function getPermissionChildren(perm: string): string[] {
  const plugin = <GraclPlugin> this;
  if (plugin._permissionChildCache[perm]) return plugin._permissionChildCache[perm].slice();

  const { action, collection } = plugin.parsePermissionString(perm);

  if (!(action && plugin.permissionHierarchy[action])) {
    plugin.error(`Permission ${perm} does not exist!`);
  }

  const children: string[] = [];
  for (let i = 0, l = plugin.permissionTypes.length; i < l; i++) {
    const alt = plugin.permissionTypes[i];

    const name = plugin.formatPermissionType({
      action: alt.name,
      collection: collection
    });

    const parents = plugin.getPermissionParents(name);
    if (parents.indexOf(perm) >= 0) {
      children.push(name);
    }
  }
  plugin._permissionChildCache[perm] = _.unique(children);
  return plugin._permissionChildCache[perm].slice();
}
