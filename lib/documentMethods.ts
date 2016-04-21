import Tyr from 'tyranid';
import * as _ from 'lodash';
import { PermissionsModel } from './models/PermissionsModel';
import { permissionExplaination } from './interfaces';



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
    plugin.validatePermissionForResource(permissionType, (<Tyr.Document> (<any> this)).$model);
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
      plugin.validatePermissionForResource(permissionType, (<Tyr.Document> (<any> this)).$model);
    }

    plugin.validatePermissionExists(permissionType);

    if (alternateUid && (typeof alternateUid !== 'string')) {
      throw new TypeError(`${altType} uid must be string`);
    }

    if (accessType && !(accessType === 'allow' || accessType === 'deny')) {
      throw new TypeError(`accessType must be allow or deny`);
    }

    if (graclType === 'resource') plugin.validateAsResource(doc.$model);

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
      plugin.validatePermissionForResource(permissionType, doc.$model);
    }

    const otherType = graclType === 'resource' ? 'subjectId' : 'resourceId',
          allPermissionTypes = [ permissionType ].concat(plugin.getPermissionParents(permissionType));

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
    if (permissionType) plugin.validatePermissionExists(permissionType);

    graclType = graclType || 'subject';
    if (graclType !== 'resource' && graclType !== 'subject') {
      throw new TypeError(`graclType must be either subject or resource!`);
    }

    if (graclType === 'resource' && permissionType) {
      plugin.validatePermissionForResource(permissionType, doc.$model);
    }

    return graclType === 'resource'
      ? PermissionsModel.getPermissionsOfTypeForResource(doc, permissionType, direct)
      : PermissionsModel.getPermissionsOfTypeForSubject(doc, permissionType, direct);
  },


  /**

  Set access to a specific permission for a subject

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

//
// check if user is allowed to view blog
//
await blog.$isAllowed('view-blog', user);
```

  */
  $setPermissionAccess(
    permissionType: string,
    access: boolean,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const plugin = PermissionsModel.getGraclPlugin();
    plugin.validatePermissionExists(permissionType);
    const context = <any> this,
          doc = <Tyr.Document> context;

    return PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
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
    plugin.validatePermissionForResource(permissionType, doc.$model);
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
          plugin = PermissionsModel.getGraclPlugin(),
          permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
          });
    plugin.validatePermissionForResource(permissionType, doc.$model);
    return this.$isAllowed(permissionType, subjectDocument);
  },



  /**

  Allow a subject access for a specific permission to this resource

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

// give user view-blog access to blog
await blog.$allow('view-blog', user);
```

  */
  $allow(
    permissionType: string,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    plugin.validatePermissionForResource(permissionType, doc.$model);
    return <Promise<Tyr.Document>> this.$setPermissionAccess(permissionType, true, subjectDocument);
  },



  /**

  Deny a subject access for a specific permission to this resource

  Example:

```js
const user = await Tyr.byName.user.findOne({ name: 'ben' });
const blog = await Tyr.byName.blog.findOne({ name: 'Chipotle Blog'});

// deny user view-blog access to blog
await blog.$deny('view-blog', user);
```

  */
  $deny(
    permissionType: string,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    plugin.validatePermissionForResource(permissionType, doc.$model);
    return <Promise<Tyr.Document>> this.$setPermissionAccess(permissionType, false, subjectDocument);
  },




  /**

  Allow a subject access for a specific permission, using the resource
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
    permissionAction: string,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
          });
    plugin.validatePermissionForResource(permissionType, doc.$model);
    return <Promise<Tyr.Document>> context.$allow(permissionType, subjectDocument);
  },



  /**

  Deny a subject access for a specific permission, using the resource
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
    permissionAction: string,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
          });

    plugin.validatePermissionForResource(permissionType, doc.$model);
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

    plugin.validatePermissionForResource(permissionType, doc.$model);
    return PermissionsModel.explainPermission(doc, permissionType, subjectDocument);
  }




};
