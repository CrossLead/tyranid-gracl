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
    for (const name of path) {
      o = o[name] = o[name] || {};
    }
  };

  plugin.graclHierarchy.subjects.forEach(build(hierarchy.subjects));
  plugin.graclHierarchy.resources.forEach(build(hierarchy.resources));
  return hierarchy;
}
