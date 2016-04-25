import { GraclPlugin } from '../';


/**
 *  Display neatly formatted view of permissions hierarchy
 */
export function logHierarchy() {
  const plugin = <GraclPlugin> this;
  console.log(`created gracl permissions hierarchy based on tyranid schemas: `);
  console.log(
    '  | \n  | ' +
    JSON
      .stringify(plugin.getObjectHierarchy(), <any> null, 4) // TODO: strictNullChecks hack
      .replace(/[{},\":]/g, '')
      .replace(/^\s*\n/gm, '')
      .split('\n')
      .join('\n  | ')
      .replace(/\s+$/, '')
      .replace(/resources/, '---- resources ----')
      .replace(/subjects/, '---- subjects ----') +
    '____'
  );
}
