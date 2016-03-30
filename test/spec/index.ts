/// <reference path='../../typings/main.d.ts' />
/// <reference path='../test-typings.d.ts'/>
import Tyr from 'tyranid';
import * as tpmongo from 'tpmongo';
import * as _ from 'lodash';
import * as tyranidGracl from '../../lib/index';
import { expect } from 'chai';
import { expectedLinkPaths } from '../helpers/expectedLinkPaths';
import { createTestData } from '../helpers/createTestData';
import { expectAsyncToThrow } from '../helpers/expectAsyncToThrow';


type GraclPlugin = tyranidGracl.GraclPlugin;

const VERBOSE_LOGGING = false;


const permissionKey = 'graclResourcePermissionIds',
      db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
      root = __dirname.replace(/test\/spec/, ''),
      secure = new tyranidGracl.GraclPlugin({
        verbose: VERBOSE_LOGGING,
        permissionIdProperty: permissionKey,
        permissionTypes: [
          { name: 'edit', abstract: false },
          { name: 'view', parent: 'edit', abstract: false },
          { name: 'delete', abstract: false },
          { name: 'abstract_view_chart', abstract: true, parents: [
            'view-user',
            'view-post'
          ]},
          { name: 'view_alignment_triangle', abstract: true, parents: [
            'edit_alignment_triangle',
            'view_alignment_triangle_component'
          ]},

          { name: 'edit_alignment_triangle', abstract: true },
          { name: 'view_alignment_triangle_component', abstract: true }
        ]
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

  const updatedChopped = secure.setPermissionAccess(chopped, `${perm}-post`, true, ben);

  return updatedChopped;
}


describe('tyranid-gracl', () => {


  before(async () => {

    Tyr.config({
      db: db,
      validate: [
        { dir: root + '/test/models',
          fileMatch: '[a-z].js' }
      ],
      secure: secure,
      cls: false
    });

    await createTestData();
  });


  beforeEach(async () => {
    await createTestData();
  });


  describe('utility functions', () => {

    it('should correctly find links using getCollectionLinksSorted', () => {
      const Chart = Tyr.byName['chart'],
            options = { direction: 'outgoing' },
            links = tyranidGracl.getCollectionLinksSorted(Chart, options);

      expect(links, 'should produce sorted links')
        .to.deep.equal(_.sortBy(Chart.links(options), field => field.link.def.name));
    });

    it('should find specific link using findLinkInCollection', () => {
      const Chart     = Tyr.byName['chart'],
            User      = Tyr.byName['user'],
            linkField = tyranidGracl.findLinkInCollection(Chart, User);

      expect(linkField).to.exist;
      expect(linkField.link.def.name).to.equal('user');
      expect(linkField.spath).to.equal('userIds');
    });


    it('should correctly create formatted queries using createInQueries', async () => {
      const getIdsForCol = async (col: string) => {
        return <string[]> _.map(await Tyr.byName[col].find({}), '_id');
      };

      const blogIds = await getIdsForCol('blog'),
            userIds = await getIdsForCol('user'),
            chartIds = await getIdsForCol('chart');

      const queryAgainstChartMap = new Map([
        [ 'blog', new Set(blogIds) ],
        [ 'user', new Set(userIds) ],
        [ 'chart', new Set(chartIds) ]
      ]);

      const query = tyranidGracl.createInQueries(queryAgainstChartMap, Tyr.byName['chart'], '$in');

      const _idRestriction = _.find(query['$or'], v => _.contains(_.keys(v), '_id')),
            blogIdRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'blogId')),
            userIdsRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'userIds'));

      checkStringEq(_idRestriction['_id']['$in'], chartIds, 'should correctly map own _id field');
      checkStringEq(blogIdRestriction['blogId']['$in'], blogIds, 'should find correct property');
      checkStringEq(userIdsRestriction['userIds']['$in'], userIds, 'should find correct property');

      const createQueryNoLink = () => {
        tyranidGracl.createInQueries(queryAgainstChartMap, Tyr.byName['organization'], '$in');
      };

      expect(createQueryNoLink, 'creating query for collection with no outgoing link to mapped collection')
        .to.throw(/No outgoing link/);
    });


    it('should return correct ids after calling stepThroughCollectionPath', async () => {
      const chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' }),
            chipotleBlogs = await Tyr.byName['blog'].find({ organizationId: chipotle.$id }),
            blogIds = <string[]> _.map(chipotleBlogs, '_id'),
            chipotlePosts = await Tyr.byName['post'].find({ blogId: { $in: blogIds } }),
            postIds = <string[]> _.map(chipotlePosts, '_id');

      const steppedPostIds = await tyranidGracl.stepThroughCollectionPath(
        blogIds, Tyr.byName['blog'], Tyr.byName['post']
      );

      checkStringEq(steppedPostIds, postIds, 'ids after stepping should be all relevant ids');

      await expectAsyncToThrow(
        () => tyranidGracl.stepThroughCollectionPath(
          blogIds, Tyr.byName['blog'], Tyr.byName['user']
        ),
        /cannot step through collection path, as no link to collection/,
        'stepping to a collection with no connection to previous col should throw'
      );
    });

  });


  describe('Creating the plugin', () => {

    it('should correctly produce paths between collections', () => {
      for (const a in expectedLinkPaths) {
        for (const b in expectedLinkPaths[a]) {
          expect(secure.getShortestPath(Tyr.byName[a], Tyr.byName[b]), `Path from ${a} to ${b}`)
            .to.deep.equal(expectedLinkPaths[a][b] || []);
        }
      }
    });

    it('should add permissions methods to documents', async () => {
      const ben = await Tyr.byName['user'].findOne({ name: 'ben' });
      expect(ben, 'should have method: $setPermissionAccess').to.have.property('$setPermissionAccess');
      expect(ben, 'should have method: $isAllowed').to.have.property('$isAllowed');
      expect(ben, 'should have method: $allow').to.have.property('$allow');
      expect(ben, 'should have method: $deny').to.have.property('$deny');
      expect(ben, 'should have method: $isAllowedForThis').to.have.property('$isAllowedForThis');
      expect(ben, 'should have method: $allowForThis').to.have.property('$allowForThis');
      expect(ben, 'should have method: $denyForThis').to.have.property('$denyForThis');
      expect(ben, 'should have method: $explainPermission').to.have.property('$explainPermission');

    });

    it('should create subject and resource classes for collections without links in or out', () => {
      expect(secure.graclHierarchy.resources.has('usagelog')).to.equal(true);
      expect(secure.graclHierarchy.subjects.has('usagelog')).to.equal(true);
    });

  });


  describe('Working with permissions', () => {
    it('should successfully add permissions', async () => {
      const updatedChopped = await giveBenAccessToChoppedPosts();

      const existingPermissions = await Tyr.byName['graclPermission'].find({});

      expect(existingPermissions).to.have.lengthOf(1);
      expect(existingPermissions[0]['resourceId'].toString(), 'resourceId')
        .to.equal(updatedChopped[secure.populatedPermissionsProperty][0]['resourceId'].toString());
      expect(existingPermissions[0]['subjectId'].toString(), 'subjectId')
        .to.equal(updatedChopped[secure.populatedPermissionsProperty][0]['subjectId'].toString());
      expect(existingPermissions[0]['access']['view-post'], 'access')
        .to.equal(updatedChopped[secure.populatedPermissionsProperty][0]['access']['view-post']);
    });


    it('should respect subject / resource hierarchy', async () => {
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

    it('should respect permissions hierarchy', async () => {
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


    it('should validate permissions', async () => {
      const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            chipotleCorporateBlog = await Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });

      expect(ben, 'ben should exist').to.exist;
      expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
      await expectAsyncToThrow(
        () => chipotleCorporateBlog['$isAllowed']('viewBlahBlah', ben),
        /Invalid permissionType/g,
        'checking \'viewBlahBlah\' should throw'
      );
    });

    it('should create a lock when updating permission and set to false when complete', async () => {
      await giveBenAccessToChoppedPosts();

      const locks = await tyranidGracl.PermissionLocks.find({}),
            chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

      expect(locks).to.have.lengthOf(1);
      expect(locks[0]['resourceId']).to.equal(chopped.$uid);
      expect(locks[0]['locked']).to.equal(false);
    });


    it('should successfully find permission when multiple permissions parents', async () => {
      await giveBenAccessToChoppedPosts();

      const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

      const access = await chopped['$isAllowed']('abstract_view_chart', ben);
      expect(access).to.equal(true);
    });


    it('should throw error when trying to lock same resource twice', async() => {
      const chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });
      await tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle);
      await expectAsyncToThrow(
        () => tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle),
        /another update is in progress/,
        'cannot lock resource that is already locked'
      );
      await tyranidGracl.PermissionsModel.unlockPermissionsForResource(chipotle);
    });


    it('should modify existing permissions instead of creating new ones', async () => {
      await giveBenAccessToChoppedPosts();

      const ben     = await Tyr.byName['user'].findOne({ name: 'ben' }),
            chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

      expect(chopped[secure.permissionIdProperty], 'chopped should start with one permission').to.have.lengthOf(1);

      expect(ben, 'ben should exist').to.exist;
      expect(chopped, 'chopped should exist').to.exist;

      const updatedChopped = await chopped['$allow']('view-user', ben);

      expect(updatedChopped[permissionKey], 'chopped should end with one permission').to.have.lengthOf(1);

      const allPermissions = await tyranidGracl.PermissionsModel.find({});

      expect(allPermissions, 'there should be one permission in the database').to.have.lengthOf(1);
    });


    it('should successfully remove all permissions after secure.deletePermissions()', async () => {
      const ted = await Tyr.byName['user'].findOne({ name: 'ted' }),
            ben = await Tyr.byName['user'].findOne({ name: 'ben' });

      const chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' }),
            cava = await Tyr.byName['organization'].findOne({ name: 'Cava' }),
            post = await Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' }),
            chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });

      expect(!ted[secure.permissionIdProperty]).to.equal(true);

      const permissionsForTed = await Tyr.byName['graclPermission'].find({
        $or: [
          { subjectId: ted.$uid },
          { resourceId: ted.$uid }
        ]
      });

      expect(permissionsForTed).to.have.lengthOf(0);

      const prePermissionChecks = await Promise.all([
        chopped['$isAllowed']('view-user', ted),
        cava['$isAllowed']('view-post', ted),
        post['$isAllowed']('edit-post', ted),
        ted['$isAllowed']('view-user', ben),
        chipotle['$isAllowed']('view-post', ted)
      ]);

      expect(_.all(prePermissionChecks)).to.equal(false);

      const permissionOperations = await Promise.all([
        chopped['$allow']('view-user', ted),
        cava['$allow']('view-post', ted),
        post['$allow']('edit-post', ted),
        chipotle['$deny']('view-post', ted),
        ted['$allow']('view-user', ben)
      ]);

      const updatedTed = await Tyr.byName['user'].findOne({ name: 'ted' });

      expect(ted[secure.permissionIdProperty]).to.have.lengthOf(1);

      const updatedPermissionsForTed = await Tyr.byName['graclPermission'].find({
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

      expect(_.all(permissionChecks)).to.equal(true);
      expect(await chipotle['$isAllowed']('view-post', ted)).to.equal(false);

      await secure.deletePermissions(ted);

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

      expect(updatedChopped[secure.permissionIdProperty]).to.have.length(0);
      expect(updatedCava[secure.permissionIdProperty]).to.have.length(0);
      expect(updatedPost[secure.permissionIdProperty]).to.have.length(0);
      expect(updatedChipotle[secure.permissionIdProperty]).to.have.length(0);
    });


    it('should correctly explain permissions', async () => {
      await giveBenAccessToChoppedPosts();

      const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

      const access = await chopped['$explainPermission']('view-post', ben);

      expect(access.reason).to.match(/Permission set on <Resource:organization/);
      expect(access.access).to.equal(true);
      expect(access.type).to.equal('view-post');
    });


  });






  describe('plugin.query()', () => {

    it('should return false with no user', async () => {
      const Post = Tyr.byName['post'],
            query = await secure.query(Post, 'view');

      expect(query, 'query should be false').to.equal(false);
    });


    it('should return empty object for collection with no permissions hierarchy node', async () => {
      const Chart = Tyr.byName['chart'],
            ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            query = await secure.query(Chart, 'view', ben);

      expect(query, 'query should be {}').to.deep.equal({});
    });


    it('should produce query restriction based on permissions', async () => {
      await giveBenAccessToChoppedPosts();

      const Post = Tyr.byName['post'],
            Blog = Tyr.byName['blog'],
            Org = Tyr.byName['organization'],
            ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            chopped = await Org.findOne({ name: 'Chopped' });

      const choppedBlogs = await Blog.find(
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

    it('should produce $and clause with excluded and included ids', async () => {
      const ted = await Tyr.byName['user'].findOne({ name: 'ted' }),
            ben = await Tyr.byName['user'].findOne({ name: 'ben' });

      const chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' }),
            cava = await Tyr.byName['organization'].findOne({ name: 'Cava' }),
            chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' }),
            cavaBlogs = await Tyr.byName['blog'].find({ organizationId: cava.$id }),
            chipotleBlogs = await Tyr.byName['blog'].find({ organizationId: chipotle.$id }),
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

  });


  describe('Collection.find()', () => {
    it('should be appropriately filtered based on permissions', async () => {
      await giveBenAccessToChoppedPosts();

      const Post = Tyr.byName['post'],
            User = Tyr.byName['user'],
            Blog = Tyr.byName['blog'],
            Org = Tyr.byName['organization'],
            ben = await User.findOne({ name: 'ben' });

      const postsBenCanSee = await Post.find({}, null, { tyranid: { secure: true, user: ben } });

      const chopped = await Org.findOne({ name: 'Chopped' });

      const choppedBlogs = await Blog.find(
        { organizationId: chopped.$id },
        { _id: 1 }
      );

      const choppedPosts = await Post.find({
        blogId: { $in: _.map(choppedBlogs, '_id') }
      });

      checkStringEq(
        <string[]> _.map(postsBenCanSee, '_id'),
        <string[]> _.map(choppedPosts, '_id'),
        'ben should only see chopped posts'
      );

    });

    it('should default to lowest hierarchy permission', async () => {
      const chopped      = await giveBenAccessToChoppedPosts(),
            ben          = await Tyr.byName['user'].findOne({ name: 'ben' }),
            post         = await Tyr.byName['post'].findOne({ text: 'Salads are great, the post.' }),
            choppedBlogs = await Tyr.byName['blog'].find({ organizationId: chopped.$id }),
            choppedPosts = await Tyr.byName['post'].find(
              { blogId: { $in: choppedBlogs.map(b => b.$id) } }
            );

      // all chopped posts
      expect(choppedPosts).to.have.lengthOf(2);
      expect(_.map(choppedPosts, '$id')).to.contain(post.$id);

      // explicitly deny view access to this post
      await post['$deny']('view-post', ben);

      const postsBenCanSee = await Tyr.byName['post'].find({}, null, { tyranid: { secure: true, user: ben } });

      expect(postsBenCanSee).to.have.lengthOf(1);
      expect(_.map(postsBenCanSee, '$id')).to.not.contain(post.$id);
    });

  });


});
