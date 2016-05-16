import { startCase } from 'lodash';
import { GraclPlugin } from '../';

export function formatPermissionLabel(perm: string): string {
  const plugin = <GraclPlugin> this,
        components = plugin.parsePermissionString(perm),
        obj = plugin.getPermissionObject(perm),
        format = obj && obj.format;

  if (format) {
    if (typeof format === 'string') {
      return format;
    } else {
      return format(components.action, components.collection);
    }
  } else {
    return startCase(perm);
  }
}