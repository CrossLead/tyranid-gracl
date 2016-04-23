import * as _ from 'lodash';
import { GraclPlugin } from '../';

/**
 *  Get all parent permissions of perm
 */
export function getPermissionParents(perm: string): string[] {
  const parents: string[] = [],
        plugin = <GraclPlugin> this;

  let nextPermissions = plugin.nextPermissions(perm);
  while (nextPermissions.length) {
    parents.push(...nextPermissions);
    nextPermissions = <string[]> _.chain(nextPermissions)
      .map(p => plugin.nextPermissions(p))
      .flatten()
      .value();
  }
  return _.unique(parents);
}
