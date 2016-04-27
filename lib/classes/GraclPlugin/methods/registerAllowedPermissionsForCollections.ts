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

  const crudPermissions = [...plugin.crudPermissionSet];

  Tyr.collections.forEach(col => {
    const config = <schemaGraclConfigObject> _.get(col, 'def.graclConfig', {});

    if (config.permissions) {

      let allowedSet = new Set<string>();

      let excludeSet = new Set();
      if (config.permissions.exclude) {
        excludeSet = new Set(config.permissions.exclude);
        for (const p of plugin.setOfAllPermissions) {
          if (p && !excludeSet.has(p)) {
            allowedSet.add(p)
          }
        }
      }

      if (config.permissions.excludeCollections) {
        _.chain(config.permissions.excludeCollections)
          .map(collection => _.map(crudPermissions,
            action => action && plugin.formatPermissionType({
              action,
              collection
            })
          ))
          .flatten()
          .compact()
          .forEach(excludeSet.add.bind(excludeSet))
          .value()
        for (const p of plugin.setOfAllPermissions) {
          if (p && !excludeSet.has(p)) {
            allowedSet.add(p)
          }
        }
      }

      if (config.permissions.include) {
        allowedSet = new Set(config.permissions.include);
      }

      if (config.permissions.includeCollections) {
        _.chain(config.permissions.includeCollections)
          .map(collection => _.map(crudPermissions,
            action => action && plugin.formatPermissionType({
              action,
              collection
            })
          ))
          .flatten()
          .compact()
          .forEach(allowedSet.add.bind(allowedSet))
          .value();
      }

      // if flagged as this collection only,
      // add all crud permissions with this collection to allowed mapping
      if (config.permissions.thisCollectionOnly) {
        allowedSet = new Set(_.chain(crudPermissions).map(action => {
          if (!action) {
            return ''; // TODO: strictNullCheck hack
          } else {
            return plugin.formatPermissionType({
              action: action,
              collection: col.def.name
            });
          }
        }).compact().value());
      }


      if (allowedSet) {
        plugin.permissionRestrictions.set(col.def.name, allowedSet);
      }
    }
  });

}
