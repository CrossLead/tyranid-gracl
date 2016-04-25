import { Node } from 'gracl';
import { GraclPlugin } from '../';

export function getObjectHierarchy() {
  const plugin = <GraclPlugin> this,
        hierarchy = {
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
