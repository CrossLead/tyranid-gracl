import Tyr from 'tyranid';
import * as _ from 'lodash';
import { GraclPlugin } from '../';
import { Hash } from '../../../interfaces';

/**
 *  Create graph of outgoing links to collections and
    compute shortest paths between all edges (if exist)
    using Floyd–Warshall Algorithm with path reconstruction
 */
export function buildLinkGraph() {
  const plugin = <GraclPlugin> this,
        g: Hash<Set<string>> = {};

  plugin.log(`creating link graph...`);

  _.each(Tyr.collections, col => {
    const links = col.links({ direction: 'outgoing' }),
          colName = col.def.name;

    _.each(links, linkField => {
      const edges = _.get(g, colName, new Set<string>()),
            linkName = linkField.link.def.name;

      edges.add(linkName);

      _.set(g, linkName, _.get(g, linkName, new Set()));
      _.set(g, colName, edges);
    });
  });

  const dist: Hash<Hash<number>> = {},
        next: Hash<Hash<string>> = {},
        keys = _.keys(g);


  _.each(keys, a => {
    _.each(keys, b => {
      _.set(dist, `${a}.${b}`, Infinity);
    });
  });

  _.each(keys, a => {
    _.set(dist, `${a}.${a}`, 0);
  });

  _.each(keys, a => {
    _.each(keys, b => {
      if (g[a].has(b)) {
        _.set(dist, `${a}.${b}`, 1);
        _.set(next, `${a}.${b}`, b);
      }
    });
  });

  // Floyd–Warshall Algorithm with path reconstruction
  _.each(keys, a => {
    _.each(keys, b => {
      _.each(keys, c => {
        if (dist[b][c] > dist[b][a] + dist[a][c]) {
          dist[b][c] = dist[b][a] + dist[a][c];
          next[b][c] = next[b][a];
        }
      });
    });
  });

  plugin._outgoingLinkPaths = next;
}
