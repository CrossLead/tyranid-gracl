import { Tyr } from 'tyranid';
import { Hash } from './util';
import { PermissionExplaination } from './permission';

/**
 *
 * interface describing all methods mixed-in by this plugin
 *
 */
export interface DocumentPermissionsMethods {
  /**

   Remove a specific type of permission relating to this entity, with
   this entity being treated as a subject

   Example:

 ```js
 const user = await Tyr.byName.user.findOne({ name: 'ben' });

// remove all view-blog permissions with user as subject
await user.$removePermissionAsSubject('view-blog');

// remove all view-user permissions with user as subject, and altUser as subject
await user.$removePermissionAsSubject('view-user', null, altUser.$uid);

// remove all deny view-user permissions with user as subject
await user.$removePermissionAsSubject('view-user', 'deny');
 ```

   */
  $removePermissionAsSubject<T extends Tyr.Document>(
    this: T,
    permissionType: string,
    type?: 'allow' | 'deny',
    uid?: string
  ): Promise<T>;

  /**

   Remove a specific type of permission relating to this entity, with
   this entity being treated as a resource

   Example:

 ```js
 const user = await Tyr.byName.user.findOne({ name: 'ben' });

// remove all view-blog permissions with user as resource
await user.$removePermissionAsResource('view-blog');

// remove all view-user permissions with user as resource, and altUser as subject
await user.$removePermissionAsResource('view-user', null, altUser.$uid);

// remove all deny view-user permissions with user as resource
await user.$removePermissionAsResource('view-user', 'deny');
 ```

   */
  $removePermissionAsResource<T extends Tyr.Document>(
    this: T,
    permissionType: string,
    type?: 'allow' | 'deny',
    uid?: string
  ): Promise<T>;

  /**

   Remove a specific type of permission relating to this entity

   Example:

 ```js
 const user = await Tyr.byName.user.findOne({ name: 'ben' });

// remove all view-blog permissions with user as subject
await user.$removeEntityPermission('subject', 'view-blog');

// remove all view-user permissions with user as resource, and altUser as subject
await user.$removeEntityPermission('resource', 'view-user', null, altUser.$uid);

// remove all deny view-user permissions with user as resource
await user.$removeEntityPermission('resource', 'view-user', 'deny');
 ```

   */
  $removeEntityPermission<T extends Tyr.Document>(
    this: T,
    graclType: 'subject' | 'resource',
    permissionType: string,
    accessType?: 'allow' | 'deny',
    alternateUid?: string
  ): Promise<T>;

  /**

  retrieve a list of uids that have **Explicit** (not inherited!)
  access to the document (if graclType === 'resource')
  or the document has access to (if graclType === 'subject' -- default)

   Example:

 ```js
 const user = await Tyr.byName.user.findOne({ name: 'ben' });

 const entitiesWithUserHasViewBlogAccessTo = await user.$entitiesWithPermission('view-blog');
 const entitiesWhichHaveViewUserAccessToUser = await user.$entitiesWithPermission('view-user', 'resource');
 ```

   */
  $entitiesWithPermission<T extends Tyr.Document>(
    this: T,
    permissionType: string,
    graclType?: 'resource' | 'subject'
  ): Promise<string[]>;

  /**

   retrieve all the permissions relating to the document
   for a specific permission (if given, otherwise all permissions)
   given that the document is a subject (default) or a resource
   (if passed graclType = 'resource')

   Example:

 ```js
 const user = await Tyr.byName.user.findOne({ name: 'ben' });

 const permissionsWithUserAsSubject = await user.$permissions();
 const viewBlogPermissionsWithUserAsSubject = await user.$permissions('view-blog');
 const viewUserPermissionsWithUserAsResource = await user.$permissions('view-user', 'resource');
 const permissionsWithUserAsResource = await user.$permissions(null, 'resource');
 ```

   */
  $permissions<T extends Tyr.Document>(
    this: T,
    permissionType?: string,
    graclType?: 'resource' | 'subject',
    direct?: boolean
  ): Promise<Tyr.Document[]>;

  /**

  Set access to a specific permissions for a subject

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

//
// set access to multiple permissions
//
await blog.$updatePermissions({
  'view-blog': true
  'edit-user': false
}, user);
```

  */
  $updatePermissions<T extends Tyr.Document>(
    this: T,
    permissionChanges: Hash<boolean>,
    subjectDocument?: Tyr.Document | string
  ): Promise<Tyr.Document | null>;

  /**

  Check if a subject is allowed a specific permission to a resource.

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

//
// check if user is allowed to view blog
//
const userHasAccessToBlog = await blog.$isAllowed('view-blog', user);
```

  */
  $isAllowed<T extends Tyr.Document>(
    this: T,
    permissionType: string,
    subjectDocument?: Tyr.Document | string
  ): Promise<boolean>;

  /**

  Check if a subject is allowed a specific permission to a resource, using the
  resource collection to determine the permission collection.

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

// checks if user has view-blog access to <blog>
// the 'view-blog' permission comes from the fact that <blog>
// is in the blog collection
const userHasAccessToBlog = await blog.$isAllowedForThis('view', user);
```

  */
  $isAllowedForThis<T extends Tyr.Document>(
    this: T,
    permissionAction: string,
    subjectDocument?: Tyr.Document | string
  ): Promise<boolean>;

  /**

  Allow a subject access for a specific permission(s) to this resource

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

// give user view-blog access to blog
await blog.$allow('view-blog', user);
```

  */
  $allow<T extends Tyr.Document>(
    this: T,
    permissionType: string | string[],
    subjectDocument?: Tyr.Document | string
  ): Promise<T>;

  /**

  Deny a subject access for a specific permission(s) to this resource

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

// deny user view-blog access to blog
await blog.$deny('view-blog', user);
```

  */
  $deny<T extends Tyr.Document>(
    this: T,
    permissionType: string | string[],
    subjectDocument?: Tyr.Document | string
  ): Promise<T>;

  /**

  Allow a subject access for a specific permission(s), using the resource
  collection to determine the permission collection, to this resource

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

// give user view-blog access to blog
await blog.$allowForThis('view', user);
```

  */
  $allowForThis<T extends Tyr.Document>(
    this: T,
    permissionAction: string | string[],
    subjectDocument?: Tyr.Document | string
  ): Promise<T>;

  /**

  Deny a subject access for a specific permission(s), using the resource
  collection to determine the permission collection, to this resource

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

// deny user view-blog access to blog
await blog.$denyForThis('view', user);
```

  */
  $denyForThis<T extends Tyr.Document>(
    this: T,
    permissionAction: string | string[],
    subjectDocument?: Tyr.Document | string
  ): Promise<T>;

  /**

  Return an object that provides an explaination of why a subject has access or does not
  for a specific permission relative to a specific resource.

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

// deny user view-blog access to blog
const explaination = await blog.$explainPermission('view-blog', user);

// log whether the user has view-blog
console.log(explaination.access);

// log a reason for why the user does or doesn't have access
console.log(explaination.reason);

// log the type of permission
console.log(explaination.type)
```

  */
  $explainPermission<T extends Tyr.Document>(
    this: T,
    permissionType: string,
    subjectDocument?: Tyr.Document | string
  ): Promise<PermissionExplaination>;

  /**

  Return an object that provides an explaination of why a subject has access or does not
  for a specific permission(s) relative to a specific resource.

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});
const results = await blog.$determineAccess(['view-blog', 'edit-user'], user);

// log whether the user has view-blog
console.log(results['view-blog'].access);

// log a reason for why the user does or doesn't have access
console.log(results['view-blog'].reason);

// log the type of permission
console.log(results['view-blog'].type)
```

  */
  $determineAccess<T extends Tyr.Document>(
    this: T,
    permissionType: string | string[],
    subjectDocument?: Tyr.Document | string
  ): Promise<Hash<boolean>>;

  /**

  Given a list of permissions and a list of uids,
  return an object that maps the uids -> permission -> boolean.
  Example:

```js
const chopped = await giveBenAccessToChoppedPosts();
const ben = await Tyr.byName['user'].findOne({ name: 'ben' });
const posts = await Tyr.byName['post'].findAll({ });

const permissions = ['view', 'edit', 'delete'];
const uids = _.map(posts, '$uid');

const accessObj = await ben.$determineAccessToAllPermissionsForResources(permissions, uids);

// check if ben has view access to document p0057365273edce8e452bee9cfa
console.log(accessObj.p0057365273edce8e452bee9cfa.view)
```

  */
  $determineAccessToAllPermissionsForResources<T extends Tyr.Document>(
    this: T,
    permissionsToCheck: string[],
    resourceUidList: string[] | Tyr.Document[]
  ): Promise<{
    [k: string]: {
      [k: string]: boolean;
    };
  }>;

  /**

  Given a list of permissions, or a single permission,
  return a list of all subject (Tyr.Document) that have access to this resource. Will
  throw error if called on a document that is not a resource.

  Example:

```js
const ben = await Tyr.byName['user'].findOne({ name: 'ben' });

const viewAccessToBen = await ben.$canAccessThis(); // defaults to 'view'
const editAccessToBen = await ben.$canAccessThis('edit');
const editAndViewNMToBen = await ben.$canAccessThis(['edit', 'view_network_map']);

// can also pass multiple args without array
const editAndViewNMToBen = await ben.$canAccessThis('edit', 'view_network_map');
```

  */
  $canAccessThis<T extends Tyr.Document>(
    this: T,
    permissionsToCheck?: string | string[],
    ...more: Array<string | string[]>
  ): Promise<Tyr.Document[]>;

  /**

  Given a list of permissions, or a single permission,
  return a list of all subject (Tyr.Document) that are denied access to this resource. Will
  throw error if called on a document that is not a resource.

  Example:

```js
const ben = await Tyr.byName['user'].findOne({ name: 'ben' });

const deniedViewAccessToBen = await ben.$deniedAccessToThis(); // defaults to 'view'
const deniedEditAccessToBen = await ben.$deniedAccessToThis('edit');
const deniedEditAndViewNMToBen = await ben.$deniedAccessToThis(['edit', 'view_network_map']);

// can also pass multiple args without array
const deniedEditAndViewNMToBen = await ben.$deniedAccessToThis('edit', 'view_network_map');
```

  */
  $deniedAccessToThis<T extends Tyr.Document>(
    this: T,
    permissionsToCheck?: string | string[],
    ...more: Array<string | string[]>
  ): Promise<Tyr.Document[]>;
}
