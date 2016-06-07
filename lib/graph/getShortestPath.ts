import Tyr from 'tyranid';
import * as _ from 'lodash';
import { GraclPlugin } from '../classes/GraclPlugin';


/**
 *  Construct a path from collection a to collection b using
    the pre-computed paths in plugin._outgoingLinkPaths
 */
export function getShortestPath(
  plugin: GraclPlugin,
  colA: Tyr.CollectionInstance,
  colB: Tyr.CollectionInstance
) {
  let a = colA.def.name,
      b = colB.def.name,
      originalEdge = `${a}.${b}`,
      next = plugin._outgoingLinkPaths;

  if (!_.get(next, originalEdge)) return [];

  const path: string[] = [ a ];

  while (a !== b) {
    a = <string> _.get(next, `${a}.${b}`);
    if (!a) return [];
    path.push(a);
  }

  return path;
}
