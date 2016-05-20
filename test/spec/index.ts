/// <reference path='../../typings/main.d.ts' />
/// <reference path='../test-typings.d.ts'/>
import Tyr from 'tyranid';
import * as mongodb from 'mongodb';
import * as path from 'path';
import * as _ from 'lodash';
import * as tyranidGracl from '../../lib/tyranid-gracl';
import { expect } from 'chai';
import { expectedLinkPaths } from '../helpers/expectedLinkPaths';
import { createTestData } from '../helpers/createTestData';
import { expectAsyncToThrow } from '../helpers/expectAsyncToThrow';
import test from 'ava';
import { Blog } from '../models/Blog';

type GraclPlugin = tyranidGracl.GraclPlugin;

const VERBOSE_LOGGING = false;

const permissionTypes = [
  { name: 'edit', format: 'TEST_LABEL', abstract: false },
  { name: 'view',
    format: (act: string, col?: string) => `Allowed to view ${_.capitalize(col)}`,
    parent: 'edit',
    abstract: false },
  { name: 'delete', abstract: false },
  { name: 'abstract_view_chart', abstract: true, parents: [
    'view-user',
    'view-post'
  ]},
  { name: 'view_alignment_triangle_private', abstract: true },

  { name: 'view-blog', collection: true, parents: [
    'view_alignment_triangle_private'
  ]},
];

const root = __dirname.replace(`${path.sep}test${path.sep}spec`, ''),
      secure = new tyranidGracl.GraclPlugin({
        verbose: VERBOSE_LOGGING,
        permissionTypes: permissionTypes
      });


const checkStringEq = (got: string[], want: string[], message = '') => {
  expect(_.map(got, s => s.toString()), message)
    .to.deep.equal(_.map(want, s => s.toString()));
};



async function giveBenAccessToChoppedPosts(perm = 'view') {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  expect(ben, 'ben should exist').to.exist;
  expect(chopped, 'chopped should exist').to.exist;

  const updatedChopped = secure.permissionsModel.updatePermissions(
    chopped, { [`${perm}-post`]: true }, ben
  );

  return updatedChopped;
}



test.before(async () => {
  const db = await mongodb.MongoClient.connect('mongodb://127.0.0.1:27017/tyranid_gracl_test');

  Tyr.config({
    db: db,
    validate: [
      { dir: root + `${path.sep}test${path.sep}models`,
        fileMatch: '[a-z].js' }
    ],
    secure: secure,
    cls: false,
    permissions: {
      find: 'view',
      insert: 'edit',
      update: 'edit',
      remove: 'delete'
    }
  });

  await secure.createIndexes();

  await createTestData();
});



test.beforeEach(createTestData);


test.serial('Should produce correctly formatted labels', () => {
  expect(secure.formatPermissionLabel('view-blog'))
    .to.equal(`Allowed to view Blog`);

  expect(secure.formatPermissionLabel('view_alignment_triangle_private'))
    .to.equal('View Alignment Triangle Private');

  expect(secure.formatPermissionLabel('edit-user'))
    .to.equal('TEST_LABEL');
});


test.serial('should correctly find links using getCollectionLinksSorted', () => {
  const Chart = Tyr.byName['chart'],
        options = { direction: 'outgoing' },
        links = secure.getCollectionLinksSorted(Chart, options);

  expect(links, 'should produce sorted links')
    .to.deep.equal(_.sortBy(Chart.links(options), field => field.link.def.name));
});



test.serial('should find specific link using findLinkInCollection', () => {
  const Chart     = Tyr.byName['chart'],
        User      = Tyr.byName['user'],
        linkField = secure.findLinkInCollection(Chart, User);

  expect(linkField).to.exist;
  expect(linkField.link.def.name).to.equal('user');
  expect(linkField.spath).to.equal('userIds');
});




test.serial('should correctly create formatted queries using createInQueries', async () => {
  const getIdsForCol = async (col: string) => {
    return <string[]> _.map(await Tyr.byName[col].findAll({}), '_id');
  };

  const blogIds = await getIdsForCol('blog'),
        userIds = await getIdsForCol('user'),
        chartIds = await getIdsForCol('chart');

  const queryAgainstChartMap = new Map([
    [ 'blog', new Set(blogIds) ],
    [ 'user', new Set(userIds) ],
    [ 'chart', new Set(chartIds) ]
  ]);

  const query = secure.createInQueries(queryAgainstChartMap, Tyr.byName['chart'], '$in');

  const _idRestriction = _.find(query['$or'], v => _.contains(_.keys(v), '_id')),
        blogIdRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'blogId')),
        userIdsRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'userIds'));

  checkStringEq(_idRestriction['_id']['$in'], chartIds, 'should correctly map own _id field');
  checkStringEq(blogIdRestriction['blogId']['$in'], blogIds, 'should find correct property');
  checkStringEq(userIdsRestriction['userIds']['$in'], userIds, 'should find correct property');

  const createQueryNoLink = () => {
    secure.createInQueries(queryAgainstChartMap, Tyr.byName['organization'], '$in');
  };

  expect(createQueryNoLink, 'creating query for collection with no outgoing link to mapped collection')
    .to.throw(/No outgoing link/);
});



test.serial('should return correct ids after calling stepThroughCollectionPath', async () => {
  const chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' }),
        chipotleBlogs = await Tyr.byName['blog'].findAll({ organizationId: chipotle.$id }),
        blogIds = <string[]> _.map(chipotleBlogs, '_id'),
        chipotlePosts = await Tyr.byName['post'].findAll({ blogId: { $in: blogIds } }),
        postIds = <string[]> _.map(chipotlePosts, '_id');

  const steppedPostIds = await secure.stepThroughCollectionPath(
    blogIds, Tyr.byName['blog'], Tyr.byName['post']
  );

  checkStringEq(steppedPostIds, postIds, 'ids after stepping should be all relevant ids');

  await expectAsyncToThrow(
    () => secure.stepThroughCollectionPath(
      blogIds, Tyr.byName['blog'], Tyr.byName['user']
    ),
    /cannot step through collection path, as no link to collection/,
    'stepping to a collection with no connection to previous col should throw'
  );
});



test.serial('should correctly produce paths between collections', () => {
  for (const a in expectedLinkPaths) {
    for (const b in expectedLinkPaths[a]) {
      const path = secure.getShortestPath(Tyr.byName[a], Tyr.byName[b]);
      expect(path, `Path from ${a} to ${b}`).to.deep.equal(expectedLinkPaths[a][b] || []);
    }
  }
});



test.serial('should add permissions methods to documents', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' });
  const methods = Object.keys(tyranidGracl.documentMethods);

  for (const method of methods) {
    method && expect(ben, `should have method: ${method}`).to.have.property(method);
  }
});



test.serial('should create subject and resource classes for collections without links in or out', () => {
  expect(secure.graclHierarchy.resources.has('usagelog')).to.equal(true);
  expect(secure.graclHierarchy.subjects.has('usagelog')).to.equal(true);
});



test.serial('should return all relevant permissions on GraclPlugin.getAllPermissionTypes()', () => {
  const number_of_resources = secure.graclHierarchy.resources.size;
  const number_of_crud_perms = _.filter(permissionTypes, (perm: { [k: string]: any }) => {
    return !perm['abstract'] && !perm['collection'];
  }).length;
  const number_of_abstract_perms = _.filter(permissionTypes, (perm: { [k: string]: any }) => {
    return perm['abstract'];
  }).length;
  const allPermissionTypes = secure.getAllPossiblePermissionTypes();
  expect(allPermissionTypes, 'should have the correct number')
    .to.have.lengthOf(
      number_of_abstract_perms + (number_of_resources * number_of_crud_perms)
    );
});



test.serial('should return correct parent permissions on GraclPlugin.getPermissionParents(perm)', () => {
  const view_blog_parents = secure.getPermissionParents('view-blog');
  expect(view_blog_parents, 'view-blog should have two parent permissions').to.have.lengthOf(2);
  expect(view_blog_parents, 'view-blog should have edit-blog parent').to.contain('edit-blog');
  expect(
    view_blog_parents,
    'view-blog should have view_alignment_triangle_private parent'
  ).to.contain('view_alignment_triangle_private');
});



test.serial('should return correct permission children on GraclPlugin.getPermissionChildren(perm)', () => {
  const edit_post_children = secure.getPermissionChildren('edit-post');
  const edit_children = secure.getPermissionChildren('edit');
  expect(edit_children, 'should include crud child').to.contain('view');
  expect(edit_post_children, 'should include specifically set abstract child').to.contain('abstract_view_chart');
  expect(edit_post_children, 'should include collection specific crud child').to.contain('view-post');
});



test.serial('should successfully add permissions', async () => {
  const updatedChopped = await giveBenAccessToChoppedPosts();
  const choppedPermissions = await updatedChopped['$permissions'](null, 'resource');
  const existingPermissions = await Tyr.byName['graclPermission'].findAll({});

  expect(existingPermissions).to.have.lengthOf(1);
  expect(existingPermissions[0]['resourceId'].toString(), 'resourceId')
    .to.equal(choppedPermissions[0]['resourceId'].toString());
  expect(existingPermissions[0]['subjectId'].toString(), 'subjectId')
    .to.equal(choppedPermissions[0]['subjectId'].toString());
  expect(existingPermissions[0]['access']['view-post'], 'access')
    .to.equal(choppedPermissions[0]['access']['view-post']);
});



test.serial('should respect subject / resource hierarchy', async () => {
  await giveBenAccessToChoppedPosts();

  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        choppedBlog = await Tyr.byName['blog'].findOne({ name: 'Salads are great' });

  expect(ben, 'ben should exist').to.exist;
  expect(choppedBlog, 'choppedBlog should exist').to.exist;

  expect(
    await choppedBlog['$isAllowed']('view-post', ben),
    'ben should have access to choppedBlog through access to chopped org'
  ).to.equal(true);
});



test.serial('should respect permissions hierarchy', async () => {
  await giveBenAccessToChoppedPosts('edit');

  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        choppedBlog = await Tyr.byName['blog'].findOne({ name: 'Salads are great' });

  expect(ben, 'ben should exist').to.exist;
  expect(choppedBlog, 'choppedBlog should exist').to.exist;

  expect(
    await choppedBlog['$isAllowed']('view-post', ben),
    'ben should have \'view\' access to choppedBlog through \'edit\' access to chopped org'
  ).to.equal(true);
});



test.serial('should correctly respect combined permission/subject/resource hierarchy', async () => {
  /**
    Set deny view-access for parent subject to parent resource
    Set allow edit-access for child subject to child resource

    should return true when checking if child subject can view
   */


  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' }),
        chipotleCorporateBlog = await Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });

  await chipotleCorporateBlog['$allow']('edit-post', ben);
  await chipotle['$deny']('view-post', chipotle);
  await chipotle['$deny']('edit-post', chipotle);

  const access = await chipotleCorporateBlog['$isAllowed']('view-post', ben);
  expect(access, 'Ben should have view access to blog').to.equal(true);
});



test.serial('should validate permissions', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chipotleCorporateBlog = await Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });

  expect(ben, 'ben should exist').to.exist;
  expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
  await expectAsyncToThrow(
    () => chipotleCorporateBlog['$isAllowed']('viewBlahBlah', ben),
    /Invalid permission type/g,
    'checking \'viewBlahBlah\' should throw'
  );
});



test.serial('should successfully find permission when multiple permissions parents', async () => {
  await giveBenAccessToChoppedPosts();

  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  const access = await chopped['$isAllowed']('abstract_view_chart', ben);
  expect(access).to.equal(true);
});


test.serial('should throw error when passing invalid uid', async () => {
  const chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  await expectAsyncToThrow(
    () => chopped['$allow']('abstract_view_chart', { $uid: 'u00undefined', $model: Tyr.byName['user'] }),
    /Invalid resource id/g,
    'invalid uid should throw (allow, string)'
  );

  await expectAsyncToThrow(
    () => chopped['$allow']('abstract_view_chart', 'u00undefined'),
    /Invalid resource id/g,
    'invalid uid should throw (allow, doc)'
  );

  await expectAsyncToThrow(
    () => chopped['$isAllowed']('abstract_view_chart', 'u00undefined'),
    /Invalid resource id/g,
    'invalid uid should throw (isAllowed, string)'
  );

  await expectAsyncToThrow(
    () => chopped['$isAllowed']('abstract_view_chart', { $uid: 'u00undefined', $model: Tyr.byName['user'] }),
    /Invalid resource id/g,
    'invalid uid should throw (isAllowed, doc)'
  );
});




test.serial('should skip a link in the hierarchy chain when no immediate parent ids present', async () => {
  const noTeamUser = await Tyr.byName['user'].findOne({ name: 'noTeams' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' }),
        chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });

  chopped['$allow']('view-post', chipotle);

  const access = await chopped['$isAllowed']('view-post', noTeamUser);
  expect(access, 'noTeamUser should have access even without teams linking to org')
    .to.equal(true);
});



test.serial('should skip multiple links in the hierarchy chain when no immediate parent ids present', async () => {
  const freeComment = await Tyr.byName['comment'].findOne({ text: 'TEST_COMMENT' }),
        ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });

  await chipotle['$allow']('view-comment', ben);

  const access = await freeComment['$isAllowed']('view-comment', ben);
  expect(access, 'ben should have access through organization')
    .to.equal(true);
});



test.serial('should modify existing permissions instead of creating new ones', async () => {
  await giveBenAccessToChoppedPosts();

  const ben     = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  expect(await chopped['$permissions'](null, 'resource'), 'chopped should start with one permission').to.have.lengthOf(1);

  expect(ben, 'ben should exist').to.exist;
  expect(chopped, 'chopped should exist').to.exist;


  expect(await chopped['$permissions'](null, 'resource'), 'chopped should end with one permission').to.have.lengthOf(1);

  const allPermissions = await tyranidGracl.PermissionsModel.findAll({});

  expect(allPermissions, 'there should be one permission in the database').to.have.lengthOf(1);
});



test.serial('should successfully remove all permissions after secure.deletePermissions()', async () => {
  const ted = await Tyr.byName['user'].findOne({ name: 'ted' }),
        ben = await Tyr.byName['user'].findOne({ name: 'ben' });

  const chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' }),
        cava = await Tyr.byName['organization'].findOne({ name: 'Cava' }),
        post = await Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' }),
        chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });

  expect(!(await ted['$permissions']()).length, 'initially should have no permissions').to.equal(true);

  const permissionsForTed = await Tyr.byName['graclPermission'].findAll({
    $or: [
      { subjectId: ted.$uid },
      { resourceId: ted.$uid }
    ]
  });

  expect(permissionsForTed, 'global search for permissions should turn up nothing').to.have.lengthOf(0);

  const prePermissionChecks = await Promise.all([
    chopped['$isAllowed']('view-user', ted),
    cava['$isAllowed']('view-post', ted),
    post['$isAllowed']('edit-post', ted),
    ted['$isAllowed']('view-user', ben),
    chipotle['$isAllowed']('view-post', ted)
  ]);

  expect(_.all(prePermissionChecks), 'all initial perm checks should return false').to.equal(false);

  const permissionOperations = await Promise.all([
    chopped['$allow']('view-user', ted),
    cava['$allow']('view-post', ted),
    post['$allow']('edit-post', ted),
    chipotle['$deny']('view-post', ted),
    ted['$allow']('view-user', ben)
  ]);

  const updatedTed = await Tyr.byName['user'].findOne({ name: 'ted' });

  expect(await ted['$permissions'](null, 'resource', true),
    'after populating teds permission (as resource), one permission should show up'
  ).to.have.lengthOf(1);

  const updatedPermissionsForTed = await Tyr.byName['graclPermission'].findAll({
    $or: [
      { subjectId: ted.$uid },
      { resourceId: ted.$uid }
    ]
  });

  expect(updatedPermissionsForTed).to.have.lengthOf(permissionOperations.length);

  const permissionChecks = await Promise.all([
    chopped['$isAllowed']('view-user', ted),
    cava['$isAllowed']('view-post', ted),
    post['$isAllowed']('edit-post', ted),
    ted['$isAllowed']('view-user', ben)
  ]);

  const tedSubjectPermissions = await ted['$permissions']();
  expect(tedSubjectPermissions).to.have.lengthOf(4);

  const tedResourcePermissions = await ted['$permissions'](null, 'resource');
  expect(tedResourcePermissions).to.have.lengthOf(2);

  const tedDirectResourcePermissions = await ted['$permissions'](null, 'resource', true);
  expect(tedDirectResourcePermissions).to.have.lengthOf(1);

  expect(_.all(permissionChecks)).to.equal(true);
  expect(await chipotle['$isAllowed']('view-post', ted)).to.equal(false);

  await secure.permissionsModel.deletePermissions(ted);

  const postPermissionChecks = await Promise.all([
    chopped['$isAllowed']('view-user', ted),
    cava['$isAllowed']('view-post', ted),
    post['$isAllowed']('edit-post', ted),
    ted['$isAllowed']('view-user', ben)
  ]);

  expect(_.all(postPermissionChecks)).to.equal(false);

  const updatedChopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' }),
        updatedCava = await Tyr.byName['organization'].findOne({ name: 'Cava' }),
        updatedPost = await Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' }),
        updatedChipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });

  expect(await updatedChopped['$permissions'](null, 'resource')).to.have.length(0);
  expect(await updatedCava['$permissions'](null, 'resource')).to.have.length(0);
  expect(await updatedPost['$permissions'](null, 'resource')).to.have.length(0);
  expect(await updatedChipotle['$permissions'](null, 'resource')).to.have.length(0);
});



test.serial('should work if passing uid instead of document', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  await chopped['$allow']('view-post', ben.$uid);
  await chopped['$deny']('view-blog', ben.$uid);

  const blogExplaination = await chopped['$explainPermission']('view-blog', ben.$uid);
  const postAccess = await chopped['$isAllowed']('view-post', ben.$uid);

  expect(blogExplaination.reason, 'blogExplaination.reason').to.match(/Permission set on <Resource:organization/);
  expect(blogExplaination.access, 'blogExplaination.access').to.equal(false);
  expect(blogExplaination.type, 'blogExplaination.type').to.equal('view-blog');
  expect(postAccess, 'postAccess').to.equal(true);
});



test.serial('should correctly explain permissions', async () => {
  await giveBenAccessToChoppedPosts();

  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  const access = await chopped['$explainPermission']('view-post', ben);

  expect(access.reason).to.match(/Permission set on <Resource:organization/);
  expect(access.access).to.equal(true);
  expect(access.type).to.equal('view-post');
});



test.serial('should remove permissions when using $removePermissionAsSubject', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  await chopped['$allow']('view-post', ben);

  const access = await chopped['$explainPermission']('view-post', ben);

  expect(access.reason).to.match(/Permission set on <Resource:organization/);
  expect(access.access).to.equal(true);
  expect(access.type).to.equal('view-post');

  await ben['$removePermissionAsSubject']('view-post');

  const accessAfterRemove = await chopped['$explainPermission']('view-post', ben);

  expect(accessAfterRemove.reason).to.match(/No permissions were set specifically/);
  expect(accessAfterRemove.access).to.equal(false);
  expect(accessAfterRemove.type).to.equal('view-post');

});



test.serial('should remove permissions when using $removePermissionAsResource', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  await chopped['$allow']('view-post', ben);

  const access = await chopped['$explainPermission']('view-post', ben);

  expect(access.reason).to.match(/Permission set on <Resource:organization/);
  expect(access.access).to.equal(true);
  expect(access.type).to.equal('view-post');

  await chopped['$removePermissionAsResource']('view-post');

  const accessAfterRemove = await chopped['$explainPermission']('view-post', ben);

  expect(accessAfterRemove.reason).to.match(/No permissions were set specifically/);
  expect(accessAfterRemove.access).to.equal(false);
  expect(accessAfterRemove.type).to.equal('view-post');

});



test.serial('should remove permissions for specific access when using $removePermissionAsResource', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        ted = await Tyr.byName['user'].findOne({ name: 'ted' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  await chopped['$allow']('view-post', ben);
  await chopped['$deny']('view-post', ted);

  const accessBen = await chopped['$explainPermission']('view-post', ben);

  expect(accessBen.reason).to.match(/Permission set on <Resource:organization/);
  expect(accessBen.access).to.equal(true);
  expect(accessBen.type).to.equal('view-post');


  const accessTed = await chopped['$explainPermission']('view-post', ted);

  expect(accessTed.reason).to.match(/Permission set on <Resource:organization/);
  expect(accessTed.access).to.equal(false);
  expect(accessTed.type).to.equal('view-post');

  await chopped['$removePermissionAsResource']('view-post', 'deny');

  const accessBenAfter = await chopped['$explainPermission']('view-post', ben);

  expect(accessBenAfter.reason).to.match(/Permission set on <Resource:organization/);
  expect(accessBenAfter.access).to.equal(true);
  expect(accessBenAfter.type).to.equal('view-post');


  const accessTedAfter = await chopped['$explainPermission']('view-post', ted);

  expect(accessTedAfter.reason).to.match(/No permissions were set specifically/);
  expect(accessTedAfter.access).to.equal(false);
  expect(accessTedAfter.type).to.equal('view-post');

});



test.serial('should correctly check abstract parent of collection-specific permission', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  await chopped['$allow']('view_alignment_triangle_private', ben);
  const access = await chopped['$isAllowed']('view-blog', ben);
  expect(access, 'should have access through abstract parent').to.equal(true);
});



test.serial('should correctly check normal crud hierarchy for crud permission with additional abstract permission', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  await chopped['$allow']('edit-blog', ben);
  const access = await chopped['$isAllowed']('view-blog', ben);
  expect(access, 'should have access through abstract parent').to.equal(true);
});



test.serial('should return false with no user', async () => {
  const Post = Tyr.byName['post'],
        query = await secure.query(Post, 'view');

  expect(query, 'query should be false').to.equal(false);
});



test.serial('should return false with no permissions', async () => {
  const Post = Tyr.byName['post'],
        ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        query = await secure.query(Post, 'edit', ben);

  expect(query, 'query should be false').to.equal(false);
});



test.serial('should return false with no permissions set for user for specific permission type', async () => {
  await giveBenAccessToChoppedPosts();

  const Post = <any> Tyr.byName['post'],
        ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        query = await secure.query(Post, 'edit', ben);

  expect(query, 'query should be false').to.equal(false);
});



test.serial('should return empty object for collection with no permissions hierarchy node', async () => {
  const Chart = Tyr.byName['chart'],
        ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        query = await secure.query(Chart, 'view', ben);

  expect(query, 'query should be {}').to.deep.equal({});
});



test.serial('should produce query restriction based on permissions', async () => {
  await giveBenAccessToChoppedPosts();

  const Post = Tyr.byName['post'],
        Blog = Tyr.byName['blog'],
        Org = Tyr.byName['organization'],
        ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Org.findOne({ name: 'Chopped' });

  const choppedBlogs = await Blog.findAll(
    { organizationId: chopped.$id },
    { _id: 1 }
  );

  const query = await secure.query(Post, 'view', ben);

  checkStringEq(
    <string[]> _.get(query, '$or.0.blogId.$in'),
    <string[]> _.map(choppedBlogs, '_id'),
    'query should find correct blogs'
  );
});

test.serial('should produce $and clause with excluded and included ids', async () => {
  const ted = await Tyr.byName['user'].findOne({ name: 'ted' }),
        ben = await Tyr.byName['user'].findOne({ name: 'ben' });

  const chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' }),
        cava = await Tyr.byName['organization'].findOne({ name: 'Cava' }),
        chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' }),
        cavaBlogs = await Tyr.byName['blog'].findAll({ organizationId: cava.$id }),
        chipotleBlogs = await Tyr.byName['blog'].findAll({ organizationId: chipotle.$id }),
        post = await Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' });

  const permissionOperations = await Promise.all([
    cava['$allow']('view-post', ted),
    post['$allow']('view-post', ted),
    chipotle['$deny']('view-post', ted)
  ]);

  const query = await secure.query(Tyr.byName['post'], 'view', ted);
  const [ positive, negative ] = <any[]> _.get(query, '$and');

  const _idRestriction    = _.find(positive['$or'], v => _.contains(_.keys(v), '_id')),
        blogIdRestriction = _.find(positive['$or'], v => _.contains(_.keys(v), 'blogId')),
        blogIdNegative    = _.find(negative['$and'], v => _.contains(_.keys(v), 'blogId'));


  checkStringEq(
    <string[]> _.get(_idRestriction, '_id.$in'),
    [ post.$id ]
  );

  checkStringEq(
    <string[]> _.get(blogIdRestriction, 'blogId.$in'),
    cavaBlogs.map(b => b.$id)
  );

  checkStringEq(
    <string[]> _.get(blogIdNegative, 'blogId.$nin'),
    chipotleBlogs.map(b => b.$id)
  );

});



test.serial('Should return all relevant entities on doc.$entitiesWithPermission(perm)', async() => {
  const ted = await Tyr.byName['user'].findOne({ name: 'ted' }),
        ben = await Tyr.byName['user'].findOne({ name: 'ben' });

  const chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' }),
        cava = await Tyr.byName['organization'].findOne({ name: 'Cava' }),
        chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' }),
        chipotleBlogs = await Tyr.byName['blog'].findAll({ organizationId: chipotle.$id }),
        post = await Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' });

  const permissionOperations = await Promise.all([
    cava['$allow']('edit-post', ted),
    post['$deny']('view-post', ted),
    chipotleBlogs[0]['$allow']('view-post', ted)
  ]);

  const entities = await ted['$entitiesWithPermission']('view-post');

  expect(entities).to.contain(cava['$uid']);
  expect(entities).to.contain(chipotleBlogs[0]['$uid']);
});



test.serial('should correctly respect combined permission/subject/resource hierarchy in query()', async () => {
  /**
    Set deny view-access for parent subject to parent resource
    Set allow edit-access for child subject to child resource

    should return true when checking if child subject can view
   */


  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' }),
        chipotleCorporateBlog = await Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });

  await chipotleCorporateBlog['$allow']('edit-post', ben);
  await chipotle['$deny']('view-post', chipotle);

  const {
    $and: [
      {
        $or: [{
          blogId: { $in: canViewBlogs }
        }]
      },
      {
        $and: [{
          blogId: { $nin: cantViewBlogs }
        }]
      }
    ]
  } = await Tyr.byName['post'].secureQuery({}, 'view', ben);

  expect(canViewBlogs.map((id: any) => id.toString())).to.contain(chipotleCorporateBlog.$id.toString());
  expect(cantViewBlogs.map((id: any) => id.toString())).to.not.contain(chipotleCorporateBlog.$id.toString());
});



test.serial('should be appropriately filtered based on permissions', async () => {
  await giveBenAccessToChoppedPosts();

  const Post = Tyr.byName['post'],
        User = Tyr.byName['user'],
        Blog = Tyr.byName['blog'],
        Org = Tyr.byName['organization'],
        ben = await User.findOne({ name: 'ben' });

  const postsBenCanSee = await Post.findAll({}, null, { tyranid: { secure: true, user: ben } });

  const chopped = await Org.findOne({ name: 'Chopped' });

  const choppedBlogs = await Blog.findAll(
    { organizationId: chopped.$id },
    { _id: 1 }
  );

  const choppedPosts = await Post.findAll({
    blogId: { $in: _.map(choppedBlogs, '_id') }
  });

  checkStringEq(
    <string[]> _.map(postsBenCanSee, '_id'),
    <string[]> _.map(choppedPosts, '_id'),
    'ben should only see chopped posts'
  );

});



test.serial('should filter based on abstract parent access of collection-specific permission', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        blogs = await Tyr.byName['blog'].findAll({ }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  await chopped['$allow']('view_alignment_triangle_private', ben);

  const blogsBenCanSee = await Tyr.byName['blog']
    .findAll({}, null, { tyranid: { secure: true, user: ben } });

  expect(blogs).to.have.lengthOf(4);
  expect(blogsBenCanSee).to.have.lengthOf(1);
  expect(blogsBenCanSee[0]['organizationId'].toString()).to.equal(chopped.$id.toString());
});



test.serial('should filter based on abstract parent access of collection-specific permission', async () => {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        blogs = await Tyr.byName['blog'].findAll({ }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  await chopped['$allow']('edit-organization', ben);

  const {
    $or: [
      {
        organizationId: {
          $in: [ organizationId ]
        }
      }
    ]
  } = await Tyr.byName['blog'].secureQuery({}, 'view-organization', ben);

  expect(organizationId.toString()).to.equal(chopped.$id.toString());
});



test.serial('should get view access to parent when parent can view itself', async () => {
   const ben = await Tyr.byName['user'].findOne({ name: 'ben' });
   const chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });
   await chipotle['$allow']('view-organization', chipotle);
   const access = await chipotle['$isAllowed']('view-organization', ben);
   expect(access, 'ben should have access through parent').to.equal(true);
});



test.serial('should default to lowest hierarchy permission', async () => {
  const chopped      = await giveBenAccessToChoppedPosts(),
        ben          = await Tyr.byName['user'].findOne({ name: 'ben' }),
        post         = await Tyr.byName['post'].findOne({ text: 'Salads are great, the post.' }),
        choppedBlogs = await Tyr.byName['blog'].findAll({ organizationId: chopped.$id }),
        choppedPosts = await Tyr.byName['post'].findAll(
          { blogId: { $in: choppedBlogs.map(b => b.$id) } }
        );

  // all chopped posts
  expect(choppedPosts).to.have.lengthOf(2);
  expect(_.map(choppedPosts, '$id')).to.contain(post.$id);

  // explicitly deny view access to this post
  await post['$deny']('view-post', ben);

  const postsBenCanSee = await Tyr.byName['post'].findAll({}, null, { tyranid: { secure: true, user: ben } });

  expect(postsBenCanSee).to.have.lengthOf(1);
  expect(_.map(postsBenCanSee, '$id')).to.not.contain(post.$id);
});



test.serial('Should restrict permission to include set in graclConfig schema option', () => {
  const allowed = secure.getAllowedPermissionsForCollection('comment');
  expect(allowed.sort()).to.deep.equal(
    [ 'view-post', 'view-blog', 'view-comment' ].sort()
  );
});



test.serial('Should throw error if attempting to use permission not allowed for collection', async () => {
  const post = await Tyr.byName['post'].findOne({}),
        ben  = await Tyr.byName['user'].findOne({ name: 'ben' });

  await expectAsyncToThrow(
    () => post['$allow']('view-user', ben),
    /tyranid-gracl: Tried to use permission "view-user" with collection "post"/,
    'Should throw when not using a post-specific permission.'
  );
});


test.serial('Should return correct allowed permissions for given collection', () => {
  const allowed = secure.getAllowedPermissionsForCollection('post'),
        blogAllowed = secure.getAllowedPermissionsForCollection('blog');
  allowed.sort();
  blogAllowed.sort();
  expect(blogAllowed).to.deep.equal(
    [...secure.setOfAllPermissions].sort()
  );
  expect(allowed).to.deep.equal([ 'delete-post', 'edit-post', 'view-post' ]);
});



test.serial('Should throw when trying to set raw crud permission', async() => {
  const post = await Tyr.byName['post'].findOne({}),
        ben  = await Tyr.byName['user'].findOne({ name: 'ben' });

  await expectAsyncToThrow(
    () => post['$allow']('view', ben),
    /Cannot use raw crud permission/,
    'Should throw when using a raw crud permission.'
  );
});



test.serial('Should return object relating uids to access level for multiple permissions when using $determineAccessToAllPermissionsForResources()', async() => {
  const chopped = await giveBenAccessToChoppedPosts(),
        ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        posts = await Tyr.byName['post'].findAll({ });

  const accessObj = await ben['$determineAccessToAllPermissionsForResources'](
    ['view', 'edit', 'delete'],
    _.map(posts, '$uid')
  );

  for (const post of posts) {
    for (const perm in accessObj[post.$uid]) {
      expect(accessObj[post.$uid][perm])
        .to.equal(await post['$isAllowedForThis'](perm, ben));
    }
  }
});



test.serial('Should allow inclusion / exclusion of all permissions for a given collection', () => {
  const inventoryAllowed = secure.getAllowedPermissionsForCollection('inventory'),
        teamAllowed = secure.getAllowedPermissionsForCollection('team');

  expect(inventoryAllowed).to.deep.equal([
    'edit-usagelog',
    'edit-organization',
    'edit-comment',
    'edit-team',
    'edit-inventory',
    'view-usagelog',
    'view-organization',
    'view-comment',
    'view-team',
    'view-inventory',
    'delete-usagelog',
    'delete-organization',
    'delete-comment',
    'delete-team',
    'delete-inventory',
    'abstract_view_chart'
  ]);
  expect(teamAllowed).to.deep.equal([
    'abstract_view_chart',
    'delete-team',
    'edit-team',
    'view-team',
    'delete-user',
    'edit-user',
    'view-user',
    'delete-chart',
    'edit-chart',
    'view-chart',
    'delete-post',
    'edit-post',
    'view-post',
    'delete-blog',
    'edit-blog',
    'view-blog'
  ]);
});



test.serial('Should handle lots of concurrent permissions updates', async () => {
  const chipotleBlog = await Tyr.byName['blog'].findOne({ name: 'Mexican Empire' }),
        ben          = await Tyr.byName['user'].findOne({ name: 'ben' });

  await Promise.all(
    _.map(
      _.range(1000),
      () => Blog.addPost(Math.random().toString(), chipotleBlog)
    )
  );

  const posts = await Tyr.byName['post'].findAll({});

  expect(posts.length, 'should be at least 1000 posts').to.be.greaterThan(1000);

  // 14,000 concurrent updates
  await Promise.all(posts.map(p => Promise.all([
    p['$allow']('view-post', ben),
    p['$allow']('edit-post', ben),
    p['$allow']('delete-post', ben),
    p['$allow']('view-post', ben),
    p['$allow']('view-post', ben),
    p['$allow']('view-post', ben),
    p['$allow']('edit-post', ben),
    p['$allow']('view-post', ben),
    p['$allow']('edit-post', ben),
    p['$allow']('delete-post', ben),
    p['$allow']('view-post', ben),
    p['$allow']('view-post', ben),
    p['$allow']('view-post', ben),
    p['$allow']('edit-post', ben)
  ])));
});
