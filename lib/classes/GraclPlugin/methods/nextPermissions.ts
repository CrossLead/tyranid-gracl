import * as _ from 'lodash';
import { GraclPlugin } from '../';
import { Hash } from '../../../interfaces';

export function nextPermissions(permissionString: string): string[] {
  const plugin = <GraclPlugin> this;
  const components = plugin.parsePermissionString(permissionString),
        // get general permissions from action
        actionParents = <Hash<string>[]> _.get(
          plugin.permissionHierarchy,
          `${components.action}.parents`,
          []
        ),
        // if a specific action-collection permission is set in the hierarchy
        permissionStringParents = <Hash<string>[]> _.get(
          plugin.permissionHierarchy,
          `${permissionString}.parents`,
          []
        );

  return _.chain(actionParents)
    .concat(permissionStringParents)
    .map('name')
    .unique()
    .map((name: string) => {
      // we need to split the name, as it may include a specific collection
      // for inheritance
      const parentPermComponents = plugin.parsePermissionString(name);

      if (!parentPermComponents.action) {
        return '';
      } else {
        return plugin.formatPermissionType({
          action: parentPermComponents.action,
          // if there was a specific collection attached to the parent permission
          // use that, otherwise use the same collection as the last permission
          collection: parentPermComponents.collection || components.collection || ''
        });
      }
    })
    .compact()
    .unique()
    .value();
}
