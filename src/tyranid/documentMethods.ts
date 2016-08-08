import Tyr from 'tyranid';
import * as _ from 'lodash';
import { PermissionsModel } from '../models/PermissionsModel';
import { permissionExplaination, Hash } from '../interfaces';

import { isCrudPermission } from '../permission/isCrudPermission';
import { validatePermissionExists } from '../permission/validatePermissionExists';
import { validatePermissionForResource } from '../permission/validatePermissionForResource';
import { getPermissionParents } from '../permission/getPermissionParents';
import { formatPermissionType } from '../permission/formatPermissionType';
import { parsePermissionString } from '../permission/parsePermissionString';

import { validateAsResource } from '../graph/validateAsResource';
import { getObjectHierarchy } from '../graph/getObjectHierarchy';
import { findLinkInCollection } from '../graph/findLinkInCollection';

/**
 *  Methods to mixin to Tyr.documentPrototype for working with permissions,
    all these methods are available on any document returned from tyranid.

    Note, all methods are called on the **Resource**, with the subject being **passed as an argument**, UNLESS
    there is a specific `graclType = 'subject' | 'resource'` parameter for the method.

    For example:

```javascript
// checks if <subject> is allowed view-post on <resource>
const subjectHasAccess = await resource.$isAllowed('view-post', subject);
```

 */
export const documentMethods = {



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
  $removePermissionAsSubject(
    permissionType: string,
    type?: 'allow' | 'deny',
    uid?: string
  ): Promise<Tyr.Document> {
    return <Promise<Tyr.Document>> this.$removeEntityPermission('subject', permissionType, type, uid);
  },



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
  $removePermissionAsResource(
    permissionType: string,
    type?: 'allow' | 'deny',
    uid?: string
  ): Promise<Tyr.Document> {
    const plugin = PermissionsModel.getGraclPlugin();
    validatePermissionForResource(plugin, permissionType, (<Tyr.Document> (<any> this)).$model);
    return <Promise<Tyr.Document>> this.$removeEntityPermission('resource', permissionType, type, uid);
  },



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
  async $removeEntityPermission(
      graclType: 'subject' | 'resource',
      permissionType: string,
      accessType?: 'allow' | 'deny',
      alternateUid?: string
    ): Promise<Tyr.Document> {
    if (!(graclType === 'subject' || graclType === 'resource')) {
      throw new TypeError(`graclType must be subject or resource`);
    }

    const altType = graclType === 'subject'
      ? 'resource'
      : 'subject';

    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    if (!permissionType) {
      throw new TypeError(`No permissionType given!`);
    }

    if (graclType === 'resource') {
      const plugin = PermissionsModel.getGraclPlugin();
      validatePermissionForResource(plugin, permissionType, (<Tyr.Document> (<any> this)).$model);
    }

    validatePermissionExists(plugin, permissionType);

    if (alternateUid && (typeof alternateUid !== 'string')) {
      throw new TypeError(`${altType} uid must be string`);
    }

    if (accessType && !(accessType === 'allow' || accessType === 'deny')) {
      throw new TypeError(`accessType must be allow or deny`);
    }

    if (graclType === 'resource') validateAsResource(plugin, doc.$model);

    const query: { [key: string]: any } = {
      [`${graclType}Id`]: doc.$uid
    };

    if (alternateUid) {
      query[`${altType}Id`] = alternateUid;
    };

    if (accessType) {
      query[`access.${permissionType}`] = (accessType === 'allow');
    }

    const update = {
      $unset: {
        [`access.${permissionType}`]: 1
      }
    };


    const matchingPerms = await PermissionsModel.findAll(query);

    await PermissionsModel.db.update(query, update, { multi: true });

    const matchingPermsAfter = await PermissionsModel.findAll(query);

    return doc;
  },



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
  async $entitiesWithPermission(
    permissionType: string,
    graclType?: 'resource' | 'subject'
  ): Promise<string[]> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    graclType = graclType || 'subject';

    if (graclType === 'resource') {
      validatePermissionForResource(plugin, permissionType, doc.$model);
    }

    const otherType = graclType === 'resource' ? 'subjectId' : 'resourceId',
          allPermissionTypes = [ permissionType ].concat(getPermissionParents(plugin, permissionType));

    return <string[]> _.chain(await PermissionsModel.findAll({
      [`${graclType}Id`]: doc.$uid,
      $or: allPermissionTypes.map(perm => {
        return { [`access.${perm}`]: true };
      })
    }))
    .map(otherType)
    .unique()
    .value();
  },



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
  $permissions(
    permissionType?: string,
    graclType?: 'resource' | 'subject',
    direct?: boolean
  ): Promise<Tyr.Document[]> {
    const context = <any> this,
          doc = <Tyr.Document> context;

    const plugin = PermissionsModel.getGraclPlugin();
    if (permissionType) validatePermissionExists(plugin, permissionType);

    graclType = graclType || 'subject';
    if (graclType !== 'resource' && graclType !== 'subject') {
      throw new TypeError(`graclType must be either subject or resource!`);
    }

    if (graclType === 'resource' && permissionType) {
      validatePermissionForResource(plugin, permissionType, doc.$model);
    }

    return graclType === 'resource'
      ? PermissionsModel.getPermissionsOfTypeForResource(doc, permissionType, direct)
      : PermissionsModel.getPermissionsOfTypeForSubject(doc, permissionType, direct);
  },


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
  $updatePermissions(
    permissionChanges: Hash<boolean>,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    _.each(permissionChanges, (_, p) => validatePermissionForResource(plugin, p, doc.$model));
    return PermissionsModel.updatePermissions(doc, permissionChanges, subjectDocument);
  },


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
  async $isAllowed(
    permissionType: string,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<boolean> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();
    validatePermissionForResource(plugin, permissionType, doc.$model);
    return PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
  },



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
  $isAllowedForThis(
    permissionAction: string,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<boolean> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    if (!isCrudPermission(plugin, permissionAction)) {
      plugin.error(`Can only use $isAllowedForThis with a crud action, given ${permissionAction}`);
    }

    const permissionType = formatPermissionType(plugin, {
      action: permissionAction,
      collection: doc.$model.def.name
    });

    validatePermissionForResource(plugin, permissionType, doc.$model);
    return this.$isAllowed(permissionType, subjectDocument);
  },



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
  $allow(
    permissionType: string | string[],
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionUpdates: Hash<boolean> = {};

    if (typeof permissionType === 'string') {
      permissionUpdates[permissionType] = true;
    } else {
      _.each(permissionType, p => permissionUpdates[p] = true);
    }

    return <Promise<Tyr.Document>> this.$updatePermissions(
      permissionUpdates,
      subjectDocument
    );
  },



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
  $deny(
    permissionType: string | string[],
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionUpdates: Hash<boolean> = {};

    if (typeof permissionType === 'string') {
      permissionUpdates[permissionType] = false;
    } else {
      _.each(permissionType, p => permissionUpdates[p] = false);
    }

    return <Promise<Tyr.Document>> this.$updatePermissions(
      permissionUpdates,
      subjectDocument
    );
  },




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
  $allowForThis(
    permissionAction: string | string[],
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    const crud = typeof permissionAction === 'string'
      ? isCrudPermission(plugin, permissionAction)
      : permissionAction.every(p => isCrudPermission(plugin, p));

    if (!crud) {
      plugin.error(`Can only use $allowForThis with a crud action, given ${permissionAction}`);
    }

    const permissionType =
      _.map(
        typeof permissionAction === 'string'
          ? [permissionAction]
          : permissionAction,
        p => formatPermissionType(plugin, {
          action: p,
          collection: doc.$model.def.name
        }));
    return <Promise<Tyr.Document>> context.$allow(permissionType, subjectDocument);
  },



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
  $denyForThis(
    permissionAction: string | string[],
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    const crud = typeof permissionAction === 'string'
      ? isCrudPermission(plugin, permissionAction)
      : permissionAction.every(p => isCrudPermission(plugin, p));

    if (!crud) {
      plugin.error(`Can only use $denyForThis with a crud action, given ${permissionAction}`);
    }

    const permissionType =
      _.map(
        typeof permissionAction === 'string'
          ? [permissionAction]
          : permissionAction,
        p => formatPermissionType(plugin, {
          action: p,
          collection: doc.$model.def.name
        }));
    return <Promise<Tyr.Document>> context.$deny(permissionType, subjectDocument);
  },




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
  async $explainPermission(
    permissionType: string,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<permissionExplaination> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    validatePermissionForResource(plugin, permissionType, doc.$model);
    return PermissionsModel.explainPermission(doc, permissionType, subjectDocument);
  },


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
  async $determineAccess(
    permissionType: string | string[],
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ) {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    const permissions = typeof permissionType === 'string'
      ? [ permissionType ]
      : permissionType;

    permissions.forEach(p => validatePermissionForResource(plugin, p, doc.$model));
    return PermissionsModel.determineAccess(doc, permissions, subjectDocument);
  },



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
  async $determineAccessToAllPermissionsForResources(
    permissionsToCheck: string[],
    resourceUidList: string[] | Tyr.Document[]
  ) {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin(),
          accessMap: Hash<Hash<boolean>> = {};

    const uidsToCheck: string[] =
      typeof resourceUidList[0] === 'string'
        ? <string[]> resourceUidList
        : <string[]> _.map(<Tyr.Document[]> resourceUidList, '$uid');

    if (!plugin.graclHierarchy.subjects.has(doc.$model.def.name)) {
      plugin.error(
        `can only call $determineAccessToAllPermissions on a valid subject, ` +
        `${doc.$model.def.name} is not a subject.`
      );
    }

    const retrievedDocumentsPromise = Promise.all(
      _.map(permissionsToCheck, perm => {
        const tyranidOpts = {
          auth: doc,
          perm: perm,
          fields: { _id: 1 }
        };

        return Tyr.byUids(uidsToCheck, tyranidOpts);
      })
    );

    // Hacky double cast for promise.all weirdness
    const retrievedDocumentMatrix = <Tyr.Document[][]> (<any> (await retrievedDocumentsPromise));

    const permissionSetHash = _.reduce(
      retrievedDocumentMatrix,
      (out, documentList, index) => {
        const permission = permissionsToCheck[index];
        out[permission] = new Set(<string[]> _.chain(documentList).map('$uid').compact().value());
        return out;
      },
      <Hash<Set<string>>> {}
    );

    _.each(uidsToCheck, uid => {
      accessMap[uid] = {};
      _.each(permissionsToCheck, perm => {
        accessMap[uid][perm] = permissionSetHash[perm].has(uid);
      });
    });

    return accessMap;
  },





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
  $canAccessThis(
    permissionsToCheck: string | string[] = 'view',
    ...more: (string | string[])[]
  ): Promise<Tyr.Document[]> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    const permissions: string[] = [];

    if (typeof permissionsToCheck === 'string') {
      permissions.push(permissionsToCheck);
    } else {
      permissions.push(...permissionsToCheck);
    }

    permissions.push(..._.flatten(more));

    return PermissionsModel.findEntitiesWithPermissionAccessToResource('allow', permissions, doc);
  },


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
  $deniedAccessToThis(
    permissionsToCheck: string | string[] = 'view',
    ...more: (string | string[])[]
  ): Promise<Tyr.Document[]> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    const permissions: string[] = [];

    if (typeof permissionsToCheck === 'string') {
      permissions.push(permissionsToCheck);
    } else {
      permissions.push(...permissionsToCheck);
    }

    permissions.push(..._.flatten(more));

    return PermissionsModel.findEntitiesWithPermissionAccessToResource('deny', permissions, doc);
  }



};
