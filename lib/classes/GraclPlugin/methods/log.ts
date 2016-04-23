import { GraclPlugin } from '../';

export function log(message: string) {
  const plugin = <GraclPlugin> this;
  if (plugin.verbose) {
    console.log(`tyranid-gracl: ${message}`);
  }
  return plugin;
}
