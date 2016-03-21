## `tyranid` plugin for `gracl` permissions library

[![Build Status](https://travis-ci.org/CrossLead/tyranid-gracl.svg?branch=master)](https://travis-ci.org/CrossLead/tyranid-gracl)

- [`tyranid`](http://tyranid.org/)
- [`gracl`](https://github.com/CrossLead/gracl)

This repository contains a plugin for `tyranid` that allows for graph-based acl permissions to be enforced / utilized
within tyranid simply by adding a few schema annotations.

### Usage example


First, you need to annotate your tyranid collections with the necessary information
for `tyranid-gracl`. For example, if we have a permissions hierarchy as follows (see gracl for more information on hierarchies)...

```
Subject Hierarchy           Resource Hierarchy

  +------------+             +------------+
  |Organization|             |Organization|
  +------+-----+             +------+-----+
         |                          |
         v                          v
      +--+-+                     +--+-+
      |Team|                     |Blog|
      +--+-+                     +--+-+
         |                          |
         v                          v
      +--+-+                     +--+-+
      |User|                     |Post|
      +----+                     +----+
```

We need to annotate our collections as follows...

```javascript

import Tyr from 'tyranid';

const OrganizationBaseCollection = new Tyr.Collection({
  id: 'o00',
  name: 'organization',
  dbName: 'organizations',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    permissionIds: { is: 'array', link: 'graclPermission' }
  }
});


const TeamBaseCollection = new Tyr.Collection({
  id: 't00',
  name: 'team',
  dbName: 'teams',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclType: 'subject'
    },
    permissionIds: { is: 'array', link: 'graclPermission' }
  }
});


const UserBaseCollection = new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'users',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    teamIds: {
      is: 'array',
      of: {
        link: 'team',
        relate: 'ownedBy',
        graclType: 'subject'
      }
    },
    organizationId: { link: 'organization' },
    permissionIds: { is: 'array', link: 'graclPermission' }
  }
});


export const BlogBaseCollection = new Tyr.Collection({
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


export const PostBaseCollection = new Tyr.Collection({
  id: 'p00',
  name: 'post',
  dbName: 'posts',
  fields: {
    _id: { is: 'mongoid' },
    title: { is: 'string' },
    text: { is: 'string' },
    blogId: {
      link: 'blog',
      relate: 'ownedBy',
      graclType: 'resource'
    },
    permissionIds: { is: 'array', link: 'graclPermission' }
  }
});
```

  Note the `relate: ownedBy` and `graclType` properties.


Next, the plugin must be created and the permissions model must go through validation.

```javascript
import Tyr from 'tyranid';
import tpmongo from 'tpmongo';
import { GraclPlugin } from 'tyranid-gracl';

const secure = new GraclPlugin();

const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []);

Tyr.config({
  db: db,
  validate: [
    { dir: root + '/test/models', fileMatch: '[a-z].js' },
    { dir: root + '/lib/models', fileMatch: '[a-z].js' }
  ],
  secure: secure
})
```

This will install the gracl plugin in tyranid and validate your permissions hierarchies as declared through the collection schema.


Now, we can utilize the provided tyranid Document prototype extensions to check/set permissions. Additioanlly, `collection.find()` queries will be automatically filtered using the hierarchy.

Method usage examples:

```javascript
import Tyr from 'tyranid';

const Organization = Tyr.byName['organization'],
      User = Tyr.byName['user'];

// get a document
const crosslead = await Organization.findOne({ name: 'CrossLead' }),
      user = await User.findOne({ name: 'ben' });


// give user ben access to all posts within crosslead organization.
await crosslead.$setPermissionAccess('view-post', true, ben);

// (more examples coming soon!)
```
