import { Node } from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';

// get the full gracl hierarhcy (mainly for display purposes)
// this is used for logging the hierarchy on instantiation of the plugin
export function getObjectHierarchy(plugin: GraclPlugin) {
  const hierarchy = {
          subjects: {},
          resources: {}
        };

  const build = (obj: any) => (node: typeof Node) => {
    const path = node.getHierarchyClassNames().reverse();
    let o = obj;
    for (let i = 0, l = path.length; i < l; i++) {
      const name = path[i];
      o = o[name] = o[name] || {};
    }
  };

  plugin.graclHierarchy.subjects.forEach(build(hierarchy.subjects));
  plugin.graclHierarchy.resources.forEach(build(hierarchy.resources));
  return hierarchy;
}
