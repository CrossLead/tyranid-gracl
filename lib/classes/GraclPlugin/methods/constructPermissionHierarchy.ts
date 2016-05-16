import { topologicalSort } from 'gracl';
import * as _ from 'lodash';
import { GraclPlugin } from '../';
import { permissionHierarchy, permissionTypeList, Hash } from '../../../interfaces';

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
  const sorted = <permissionTypeList> _.compact(topologicalSort(_.map(plugin.permissionTypes, perm => {

    if (perm.abstract === undefined && !perm.collection) {
      plugin.error(
        `Must set { abstract: true | false } property for all permission types ` +
        `unless it is a collection-specific permission ` +
        `permission ${JSON.stringify(perm)} does not have "abstract" or "collection" property`
      );
    }

    const singleParent = perm.parent;
    if (singleParent) perm.parents = [ singleParent ];

    /**
     *  Check for non-abstract permissions (as parents) which will not have a
        node listed in the permissionType list, but whose "action" should
        be a node in the list.
     */
    const parents = <string[]> perm.parents;
    if (parents) {
      if (!Array.isArray(parents)) {
        plugin.error(`parents of permission type must be given as an array!`);
      }

      const colParents = <string[]> [];
      for (const parent of parents) {
        // if we have an <action>-<collection> permission...
        if (parent && /-/.test(parent)) {
          if (!perm.abstract && !perm.collection) {
            plugin.error(
              `Cannot set collection-specific permission to be the parent of a non-abstract permission!`
            );
          }

          const parsed = plugin.parsePermissionString(parent);

          if (!(parsed.collection && plugin.graclHierarchy.resources.has(parsed.collection))) {
            plugin.error(
              `Collection ${parsed.collection} in permission ` +
              `"${parent}" does not exist in the resource hierarchy!`
            );
          }

          // add it to the list of parents of this nodes, to insure the action
          // is a listed valid permission given to the plugin
          if (parsed.action) {
            colParents.push(parsed.action);
          } else {
            plugin.error(`parent permission had no action! ${parent}`);
          }
        } else if (parent) {
          colParents.push(parent);
        }
      }
      perm.collection_parents = _.unique(colParents);
    }

    return perm;
  }), 'name', 'collection_parents'));

  const duplicates = new Set(),
        exist = new Set();

  for (const perm of sorted) {
    const name = perm && perm.name;
    if (name && exist.has(name)) {
      duplicates.add(name);
    } else if (name) {
      exist.add(name);
    }
  }

  if (duplicates.size) {
    plugin.error(`Duplicate permission types provided: ${[...duplicates].join(', ')}`);
  }

  const hierarchy: permissionHierarchy = {};

  _.each(sorted, node => {
    const name = node.name,
          parents = <string[]> (node.parents || []),
          abstract = node.abstract || false,
          collection = node.collection || false;

    if (!(abstract || collection)) {
      plugin.crudPermissionSet.add(name);
    }

    hierarchy[name] = {
      name,
      abstract: abstract,
      collection: collection,
      format: node.format,
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

        const parsed = plugin.parsePermissionString(p),
              action = parsed.action;

        if (abstract && !parsed.collection) {
          plugin.error(
            `Parent permissions of abstract permission must ` +
            `themseleves be abstract or reference a specific collection. ` +
            `Abstract permission ${name} has parent permission ${p} which is not specific to a collection`
          );
        }

        if (!(parsed.collection &&
              plugin.graclHierarchy.resources.has(parsed.collection))) {
          plugin.error(
            `Collection ${parsed.collection} in permission ` +
            `"${p}" does not exist in the resource hierarchy!`
          );
        }


        // the non-abstract parent, must itself have a parent in the hierarchy...
        const subParents: Hash<any>[] = [];
        if (action) {
          subParents.push(hierarchy[action]);
        } else {
          plugin.error(`No parent of action in permission ${p} exists!`);
        }

        return {
          name: p,
          parents: subParents
        };
      })
    };
  });

  // store the hierarchy and set of all permissions
  plugin.permissionHierarchy = hierarchy;
  plugin.setOfAllPermissions = new Set(plugin.getAllPossiblePermissionTypes());
}
