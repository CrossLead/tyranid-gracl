import { topologicalSort } from 'gracl';
import * as _ from 'lodash';
import { GraclPlugin } from '../';
import { permissionHierarchy } from '../../../interfaces';

/**
 * validate and insert provided permissionHierarchy into model
 */
export function constructPermissionHierarchy() {
  const plugin = <GraclPlugin> this;

  plugin.log(`constructing permissions hierarchy...`);

  if (!plugin.graclHierarchy) {
    plugin.error(`Must build subject/resource hierarchy before creating permission hierarchy`);
  }

  /**
   * Run topological sort on permissions values,
     checking for circular dependencies / missing nodes
   */
  const sorted = topologicalSort(_.map(plugin.permissionTypes, perm => {

    if (perm['abstract'] === undefined && !perm['collection']) {
      plugin.error(
        `Must set { abstract: true | false } property for all permission types ` +
        `unless it is a collection-specific permission ` +
        `permission ${JSON.stringify(perm)} does not have "abstract" or "collection" property`
      );
    }

    const singleParent = perm['parent'];
    if (singleParent) perm['parents'] = [ singleParent ];

    /**
     *  Check for non-abstract permissions (as parents) which will not have a
        node listed in the permissionType list, but whose "action" should
        be a node in the list.
     */
    const parents = perm['parents'];
    if (parents) {
      if (!Array.isArray(parents)) {
        plugin.error(`parents of permission type must be given as an array!`);
      }

      const colParents = <string[]> [];
      for (const parent of parents) {
        // if we have an <action>-<collection> permission...
        if (/-/.test(parent)) {
          if (!perm['abstract'] && !perm['collection']) {
            plugin.error(
              `Cannot set collection-specific permission to be the parent of a non-abstract permission!`
            );
          }

          const parsed = plugin.parsePermissionString(parent);

          if (!plugin.graclHierarchy.resources.has(parsed.collection)) {
            plugin.error(
              `Collection ${parsed.collection} in permission ` +
              `"${parent}" does not exist in the resource hierarchy!`
            );
          }

          // add it to the list of parents of this nodes, to insure the action
          // is a listed valid permission given to the plugin
          colParents.push(parsed.action);
        } else {
          colParents.push(parent);
        }
      }
      perm['collection_parents'] = _.unique(colParents);
    }

    return perm;
  }), 'name', 'collection_parents');

  const duplicates = new Set(),
        exist = new Set();

  for (const perm of sorted) {
    if (exist.has(perm['name'])) {
      duplicates.add(perm['name']);
    }
    exist.add(perm['name']);
  }

  if (duplicates.size) {
    plugin.error(`Duplicate permission types provided: ${[...duplicates].join(', ')}`);
  }

  const hierarchy: permissionHierarchy = {};

  for (const node of sorted) {
    const name = node['name'],
          parents = <string[]> node['parents'],
          abstract = node['abstract'],
          collection = node['collection'];

    if (!(abstract || collection)) {
      plugin.crudPermissionSet.add(name);
    }

    hierarchy[name] = {
      name,
      abstract: abstract,
      collection: collection,
      // need to add parents, that may be non-abstract nodes that don't directly exist in hierarchy
      parents: _.map(parents, (p: string) => {
        const hierarchyParent = hierarchy[p];

        if (abstract && hierarchyParent && !hierarchyParent.abstract) {
          plugin.error(
            `If a permission is abstract, it either needs an abstract parent ` +
            `or a parent that references a specific collection.`
          );
        }

        if (hierarchyParent) return hierarchyParent;

        const parsed = plugin.parsePermissionString(p);

        if (abstract && !parsed.collection) {
          plugin.error(
            `Parent permissions of abstract permission must ` +
            `themseleves be abstract or reference a specific collection. ` +
            `Abstract permission ${name} has parent permission ${p} which is not specific to a collection`
          );
        }

        if (!plugin.graclHierarchy.resources.has(parsed.collection)) {
          plugin.error(
            `Collection ${parsed.collection} in permission ` +
            `"${p}" does not exist in the resource hierarchy!`
          );
        }

        return {
          name: p,
          parents: [
            // the non-abstract parent, must itself have a parent in the hierarchy...
            hierarchy[parsed.action]
          ]
        };
      })
    };
  }

  // store the hierarchy and set of all permissions
  plugin.permissionHierarchy = hierarchy;
  plugin.setOfAllPermissions = new Set(plugin.getAllPossiblePermissionTypes());
}
