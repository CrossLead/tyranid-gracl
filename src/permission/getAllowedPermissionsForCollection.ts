import { GraclPlugin } from '../classes/GraclPlugin';


/**
 * Each database collection could have specific permissions
 * that are allowed to be used with it.
 *
 * @example
 * ```javascript
new Tyr.Collection({
  id: 'i00',
  name: 'inventory',
  dbName: 'inventories',
  graclConfig: {
    permissions: {
      excludeCollections: [
        'user', 'blog', 'post'
      ],
      exclude: [
        'view_alignment_triangle_private'
      ]
    }
  },
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    items: { is: 'array', of: { is: 'string' } },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclTypes: [ 'resource' ]
    }
  }
})
 * ```
 *
 * The above collection will only be allowed to be used with permissions that don't include the
 * user, blog, and post collections. Additionally, the abstract permission `view_alignment_triangle_private`
 * cannot be used with the collection.
 */
export function getAllowedPermissionsForCollection(plugin: GraclPlugin, collectionName: string) {
  const restriction = plugin.permissionRestrictions.get(collectionName);
  if (restriction) {
    return [...restriction];
  } else {
    return [...plugin.setOfAllPermissions];
  }
}
