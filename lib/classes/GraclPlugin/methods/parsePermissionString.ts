import { GraclPlugin } from '../';

export function parsePermissionString(perm: string) {
  const plugin = <GraclPlugin> this;
  if (!perm) plugin.error(`Tried to split empty permission!`);

  const [ action, collection ] = perm.split('-');
  return {
    action,
    collection
  };
}
