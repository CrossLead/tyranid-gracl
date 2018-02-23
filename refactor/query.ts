import { Tyr } from 'tyranid';
import { Plugin } from './interfaces/plugin';

/**
 *
 * create secured query
 *
 */
export async function query(
  plugin: Plugin,
  queriedCollection: Tyr.CollectionInstance,
  permissionType: string,
  subjectDocument = Tyr.local.user
) {
  return {};
}
