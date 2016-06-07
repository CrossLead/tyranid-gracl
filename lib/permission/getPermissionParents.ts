import * as _ from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';
import { nextPermissions } from './nextPermissions';

/**
 *  Get all parent permissions of perm
 */
export function getPermissionParents(plugin: GraclPlugin, perm: string): string[] {
  const parents: string[] = [];

  let nextPermissionTypes = nextPermissions(plugin, perm);
  while (nextPermissionTypes.length) {
    parents.push.apply(parents, nextPermissionTypes);
    nextPermissionTypes = <string[]> _.chain(nextPermissionTypes)
      .map(p => nextPermissions(plugin, p))
      .flatten()
      .value();
  }
  return _.unique(parents);
}