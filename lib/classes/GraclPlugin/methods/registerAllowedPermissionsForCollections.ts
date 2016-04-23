import Tyr from 'tyranid';
import * as _ from 'lodash';
import { GraclPlugin } from '../';
import { schemaGraclConfigObject } from '../../../interfaces';


export function registerAllowedPermissionsForCollections() {
  const plugin = <GraclPlugin> this;

  if (!plugin.permissionHierarchy) {
    plugin.error(
      `Must create permissions hierarchy before registering allowed permissions`
    );
  }

  Tyr.collections.forEach(col => {
    const config = <schemaGraclConfigObject> _.get(col, 'def.graclConfig', {});

    if (config.permissions) {

      let allowedSet: Set<string>;

      if (config.permissions.exclude) {
        const excludeSet = new Set(config.permissions.exclude);
        allowedSet = new Set([...plugin.setOfAllPermissions].filter(p => !excludeSet.has(p)));
      }

      if (config.permissions.include) {
        allowedSet = new Set(config.permissions.include);
      }

      // if flagged as this collection only,
      // add all crud permissions with this collection to allowed mapping
      if (config.permissions.thisCollectionOnly) {
        allowedSet = new Set(_.map([...plugin.crudPermissionSet.values()], action => {
          return plugin.formatPermissionType({
            action: action,
            collection: col.def.name
          });
        }));
      }


      if (allowedSet) {
        plugin.permissionRestrictions.set(col.def.name, allowedSet);
      }
    }
  });

}
