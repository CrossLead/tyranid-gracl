import Tyr from 'tyranid';
import * as _ from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';
import { schemaGraclConfigObject } from '../interfaces';
import { formatPermissionType } from './formatPermissionType';


export function registerAllowedPermissionsForCollections(plugin: GraclPlugin) {
  if (!plugin.permissionHierarchy) {
    plugin.error(
      `Must create permissions hierarchy before registering allowed permissions`
    );
  }

  const crudPermissions = [...plugin.crudPermissionSet];

  Tyr.collections.forEach(col => {
    const config = <schemaGraclConfigObject> _.get(col, 'def.graclConfig', {});

    if (config.permissions) {
      const hasExcludeConfig = !!(
        config.permissions.exclude ||
        config.permissions.excludeCollections
      );

      const hasIncludeConfig = !!(
        config.permissions.include ||
        config.permissions.includeCollections
      );

      let allowedSet: Set<string>;

      if (hasExcludeConfig && !hasIncludeConfig) {
        let excludeSet = new Set();

        if (config.permissions.exclude) {
          excludeSet = new Set(config.permissions.exclude);
        }

        if (config.permissions.excludeCollections) {
        _.chain(config.permissions.excludeCollections)
          .map(collection => _.map(
            crudPermissions,
            action => action && formatPermissionType(plugin, {
              action,
              collection
            })
          ))
          .flatten()
          .compact()
          .each(excludeSet.add.bind(excludeSet))
          .value();
        }

        allowedSet = new Set<string>();
        for (const p of plugin.setOfAllPermissions) {
          if (p && !excludeSet.has(p)) {
            allowedSet.add(p);
          }
        }
      }

      if (hasIncludeConfig) {
        allowedSet = new Set<string>();
        if (config.permissions.include) {
          allowedSet = new Set(config.permissions.include);
        }

        if (config.permissions.includeCollections) {
          _.chain(config.permissions.includeCollections)
            .map(collection => _.map(crudPermissions,
              action => action && formatPermissionType(plugin, {
                action,
                collection
              })
            ))
            .flatten()
            .compact()
            .each(allowedSet.add.bind(allowedSet))
            .value();
        }
      }


      // if flagged as this collection only,
      // add all crud permissions with this collection to allowed mapping
      if (config.permissions.thisCollectionOnly) {
        allowedSet = new Set(_.chain(crudPermissions).map(action => {
          if (!action) {
            return ''; // TODO: strictNullCheck hack
          } else {
            return formatPermissionType(plugin, {
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
