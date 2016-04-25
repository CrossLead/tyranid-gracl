import * as _ from 'lodash';
import { GraclPlugin } from '../';

/**
 *  Get a list of all possible permission strings
 */
export function getAllPossiblePermissionTypes(): string[] {
  const plugin = <GraclPlugin> this;
  if (plugin._allPossiblePermissionsCache) return plugin._allPossiblePermissionsCache.slice();

  const permissionSchema = plugin.permissionTypes;
  const allPermissions: string[] = [];
  const resourceCollections = Array.from(plugin.graclHierarchy.resources.keys());

  for (let i = 0, l = permissionSchema.length; i < l; i++) {
    const perm = permissionSchema[i];
    if (perm.abstract || perm.collection) {
      allPermissions.push(perm.name);
    } else {
      for (const resourceCollection of resourceCollections) {
        const formatted = plugin.formatPermissionType({
          action: perm.name,
          collection: resourceCollection
        });
        allPermissions.push(formatted);
      }
    }
  }

  return (plugin._allPossiblePermissionsCache = _.unique(allPermissions)).slice();
}
