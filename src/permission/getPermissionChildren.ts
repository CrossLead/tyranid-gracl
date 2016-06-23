import * as _ from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';
import { parsePermissionString } from './parsePermissionString';
import { formatPermissionType } from './formatPermissionType';
import { getPermissionParents } from './getPermissionParents';

/**
 *  Get all children of a permission based on the permissions hierarchy.
 *
 *  For example, if edit is set as the parent of view in the configuration,
 *  view-user will be returned as a child of edit-user.
 */
export function getPermissionChildren(plugin: GraclPlugin, perm: string): string[] {
  if (plugin._permissionChildCache[perm]) return plugin._permissionChildCache[perm].slice();

  const { action, collection } = parsePermissionString(plugin, perm);

  if (!(action && plugin.permissionHierarchy[action])) {
    plugin.error(`Permission ${perm} does not exist!`);
  }

  const children: string[] = [];
  for (let i = 0, l = plugin.permissionTypes.length; i < l; i++) {
    const alt = plugin.permissionTypes[i];

    const name = formatPermissionType(plugin, {
      action: alt.name,
      collection: collection
    });

    const parents = getPermissionParents(plugin, name);
    if (parents.indexOf(perm) >= 0) {
      children.push(name);
    }
  }
  plugin._permissionChildCache[perm] = _.unique(children);
  return plugin._permissionChildCache[perm].slice();
}
