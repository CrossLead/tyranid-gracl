# a [gracl](https://github.com/CrossLead/gracl) plugin for [tyranid](http://tyranid.org/)

[![Build Status](https://travis-ci.org/CrossLead/tyranid-gracl.svg?branch=master)](https://travis-ci.org/CrossLead/tyranid-gracl)
[![npm version](https://badge.fury.io/js/tyranid-gracl.svg)](https://badge.fury.io/js/tyranid-gracl)

This repository contains a plugin for `tyranid` that allows for graph-based acl permissions to be enforced / utilized
within tyranid simply by adding a few schema annotations.

## Tyr.Document method mixins


#### `doc.$allow(perm: string, subject: Tyr.Document): Promise<Tyr.Document>`

```javascript
// allow a subject to have a permission relating to document
await document.$allow('view-blog', subject);
```


#### `doc.$deny(perm: string, subject: Tyr.Document): Promise<Tyr.Document>`

```javascript
// deny a subject to have a permission relating to document
await document.$deny('view-blog', subject);
```


#### `doc.$allowForThis(action: string, subject: Tyr.Document): Promise<Tyr.Document>`

```javascript
// allowForThis a subject to have a permission relating to document
// note that the perm here should be an action, not a full <action-collection> perm
await document.$allowForThis('view', subject);
```


#### `doc.$denyForThis(action: string, subject: Tyr.Document): Promise<Tyr.Document>`

```javascript
// denyForThis a subject to have a permission relating to document
// note that the perm here should be an action, not a full <action-collection> perm
await document.$denyForThis('view', subject);
```


#### `doc.$isAllowed(perm: string, subject: Tyr.Document): Promise<boolean>`

```javascript
// check if a subject has a permission for document
const bool = await document.$isAllowed('view-blog', subject);
```


#### `doc.$isAllowedForThis(action: string, subject: Tyr.Document): Promise<boolean>`

```javascript
// check if a subject has a permission for document
const post = await Tyr.byName.post.findOne({ name: 'my post' });
// note that the perm here should be an action, not a full <action-collection> perm
const has_view_post_access = await post.$isAllowed('view', subject);
```


#### `doc.$explainPermission(perm: string, subject: Tyr.Document): Promise<{ access: boolean, reason: string }>`

```javascript
// deny a subject to have a permission relating to document
const explaination = await document.$explainPermission('view-blog', subject);
/**
  typeof explaination.access === boolean // has access or not
  typeof explaination.reason === string // explaining why
 */
```


#### `doc.$permissions(perm?: string, graclType?: 'resouce' | 'subject'): Promise<Tyr.Document[]>`

```javascript
// retrieve all the permissions relating to the document
// for a specific permission (if given, otherwise all permissions)
// given that the document is a subject (default) or a resource
// (if passed graclType = 'resource')
const permissionsAsSubject = await document.$permissions();
const permissionsAsResource = await document.$permissions(null, 'resource');
const viewPostPermissionsAsResource = await document.$permissions('view-post', 'resource');
```


#### `doc.$entitiesWithPermission(perm: string, graclType?: 'resouce' | 'subject'): Promise<string[]>`

```javascript
// retrieve a list of uids that have access to the document (if graclType === 'resource')
// or the document has access to (if graclType === 'subject' -- default)
const all_uids_that_document_has_view_blog_access_to = (
  await document.$entitiesWithPermission('view-blog')
);

const all_uids_that_have_view_blog_access_to_document = (
  await document.$entitiesWithPermission('view-blog', 'resource')
);
```


#### `doc.$allowedEntitiesForCollection(collectionName: string): Promise<string[]>`

```javascript
// retrieve a list of uids that the document has explicit access to in the given collection
const all_uids_that_document_can_access_in_blog_collection = (
  await document.$allowedEntitiesForCollection('blog')
);
```



## Setup

### Annotate your tyranid schemas

You need to add a `permissionIds` property to collections that
will have permissions set _for_ them (the "resources"), as well
as add annotations indicating the "hierarchy parents"...

```javascript

import Tyr from 'tyranid';

const Organization = new Tyr.Collection({
  id: 'o00',
  name: 'organization',
  dbName: 'organizations',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    // permissionsIds should be exactly like this
    permissionIds: { is: 'array', link: 'graclPermission' }
  }
});


const Team = new Tyr.Collection({
  id: 't00',
  name: 'team',
  dbName: 'teams',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    // here we indicate that "organization" is both the
    // parent subject and parent resource in the permissions
    // hierarchy
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      // can be both!
      // now, organization is implicitly also a subject and resource
      graclType: [ 'subject', 'resource' ]
    },
    // also need permissions prop!
    permissionIds: { is: 'array', link: 'graclPermission' }
  }
});


export const Blog = new Tyr.Collection({
  id: 'b00',
  name: 'blog',
  dbName: 'blogs',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclType: 'resource'
    },
    permissionIds: { is: 'array', link: 'graclPermission' }
  }
});


/**
 *  Alternatively, if there is a collection that has no collections
    pointing to it via an "ownedBy" relation, you can add a permissionIds
    field on the collection itself and specify the graclType
 */
export const UsageLog = new Tyr.Collection({
  id: 'ul0',
  name: 'usagelog',
  dbName: 'usagelogs',
  fields: {
    _id: { is: 'mongoid' },
    text: { is: 'string' },
    permissionIds: {
      is: 'array',
      link: 'graclPermission',
      graclType: [ 'subject', 'resource' ]
    }
  }
});
```

### Register the plugin

With annotated schemas, we can create and register the plugin with tyranid.

```javascript
import Tyr from 'tyranid';
import pmongo from 'promised-mongo';

// import plugin class
import { GraclPlugin } from 'tyranid-gracl';

// instantiate
const secure = new GraclPlugin();

const db = pmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test');

Tyr.config({
  db: db,
  validate: [
    { dir: root + '/test/models', fileMatch: '[a-z].js' }
  ],
  // add to tyranid config...
  secure: secure
})
```

This will install the gracl plugin in tyranid and validate your permissions hierarchies as declared through the collection schema.


### Using permissions

Now, we can utilize the provided tyranid Document prototype extensions to check/set permissions. Additionally, `collection.find()` queries will be automatically filtered using the hierarchy.

Method usage examples:

```javascript
import Tyr from 'tyranid';

/**
 *  Example express controller to set a permission
 */
export async function giveUserBlogViewAccessToOrg(req, res) {
  // assume this is a user document mixed in via middlewhere
  const user = req.user,
        // organizationId of org we want to give user view access to
        organizationId = req.query.organizationId;

  try {

    const org = await Tyr.byName
      .organization
      .byId(organizationId);

    const updatedOrg = await org.$allow('view-blog', user); // set view-blog access to true for user

  } catch (error) {
    if (/another update is in progress/.test(error.message)) {
      // the permissions model found a simultaneous update request, and denied this update
      return res.json({ message: 'Cannot update permissions now, try again.' })
    } else {
      throw error;
    }
  }

  return res.json(updatedOrg);
}


/**
 *  Example express controller to check a permission
 */
export async function checkCanViewUid(req, res) {
  // assume this is a user document mixed in via middlewhere
  const user = req.user,
        // uid of entity we want to check if <user> has view access to
        uid = req.query.uid;

  const entity = await Tyr.byUid(uid);
  const canView = await entity.$isAllowedForThis('view', user);

  return res.json(canView);
}



/**
 *  Example express controller using filtered queries
 */
export async function findBlogs(req, res) {
  const blogs = await Tyr.byName.blog.findAll({}, null, {
    tyranid: {
      secure: true,
      user: req.user
    }
  });
  return res.json(blogs);
}



/**
 *  Example creating a mongodb query that is restricted using permissions
 */
export async function getQueryForBlogsICanEdit(req, res) {
  const originalQuery = {
    name: {
      $in: [
        'myBlog',
        'otherBlog'
      ]
    }
  }
  const secured = await Tyr.byName.blog.secureQuery(originalQuery, 'edit', req.user);
  return secured;
}



/**
 *  Example express controller to delete all permissions for an entity
 */
export async function deletePermissionsRelatingToUid(req, res) {
  const uid = req.query.uid;

  try {
    await Tyr.secure.permissionsModel.deletePermissions(await Tyr.byUid(uid));
  } catch (error) {
    if (/another update is in progress/.test(error.message)) {
      // the permissions model found a simultaneous update request, and denied this update
      return res.json({ message: 'Cannot update permissions now, try again.' })
    } else {
      throw error;
    }
  }

  return res.json({ message: 'Success!' });
}

```
