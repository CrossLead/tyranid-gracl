/// <reference path='../../typings/main.d.ts' />
/// <reference path='../test-typings.d.ts'/>
import * as Tyr from 'tyranid';
import * as tpmongo from 'tpmongo';
import * as _ from 'lodash';
import * as tyranidGracl from '../../lib/index';
import { expect } from 'chai';
import { expectedLinkPaths } from '../helpers/expectedLinkPaths';
import { createTestData } from '../helpers/createTestData';
import { expectAsyncToThrow } from '../helpers/expectAsyncToThrow';


const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
      root = __dirname.replace(/test\/spec/, ''),
      secure = new tyranidGracl.GraclPlugin(),
      insecure = { tyranid: { insecure: true } };

async function giveBenAccessToChipotle() {
  const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
        chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

  expect(ben, 'ben should exist').to.exist;
  expect(chopped, 'chopped should exist').to.exist;

  const updatedChopped = await tyranidGracl
    .PermissionsModel
    .setPermissionAccess(chopped, 'view-post', true, ben);

  return updatedChopped;
}


describe('tyranid-gracl', () => {


  before(async () => {

    Tyr.config({
      db: db,
      validate: [
        { dir: root + '/test/models', fileMatch: '[a-z].js' },
        { dir: root + '/lib/models', fileMatch: '[a-z].js' }
      ],
      secure: secure,
      cls: false
    });

    await createTestData();
  });


  beforeEach(async () => {
    await createTestData();
    Tyr.local.user = undefined;
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
        return <string[]> _.map(await Tyr.byName[col].find({}, null, insecure), '_id');
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

      const _idRestriction = _.find(query.$or, v => _.contains(_.keys(v), '_id')),
            blogIdRestriction = _.find(query.$or, v => _.contains(_.keys(v), 'blogId')),
            userIdsRestriction = _.find(query.$or, v => _.contains(_.keys(v), 'userIds'));

      expect(_idRestriction['_id'], 'should correctly map own _id field').to.deep.equal({ $in: chartIds });
      expect(blogIdRestriction['blogId'], 'should find correct property').to.deep.equal({ $in: blogIds });
      expect(userIdsRestriction['userIds'], 'should find correct property').to.deep.equal({ $in: userIds });

      const createQueryNoLink = () => {
        tyranidGracl.createInQueries(queryAgainstChartMap, Tyr.byName['organization'], '$in');
      };

      expect(createQueryNoLink, 'creating query for collection with no outgoing link to mapped collection')
        .to.throw(/No outgoing link/);
    });


    it('should return correct ids after calling stepThroughCollectionPath', async () => {
      const chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' }),
            chipotleBlogs = await Tyr.byName['blog'].find({ organizationId: chipotle['_id'] }, null, insecure),
            blogIds = <string[]> _.map(chipotleBlogs, '_id'),
            chipotlePosts = await Tyr.byName['post'].find({ blogId: { $in: blogIds } }),
            postIds = <string[]> _.map(chipotlePosts, '_id');

      const steppedPostIds = await tyranidGracl.stepThroughCollectionPath(
        blogIds, Tyr.byName['blog'], Tyr.byName['post']
      );

      expect(steppedPostIds, 'ids after stepping should be all relevant ids').to.deep.equal(postIds);

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
      expect(ben, 'should have method: $isAllowed').to.have.property('$isAllowed');
      expect(ben, 'should have method: $setPermissionAccess').to.have.property('$setPermissionAccess');
      expect(ben, 'should have method: $allow').to.have.property('$allow');
      expect(ben, 'should have method: $deny').to.have.property('$deny');
    });

  });


  describe('Working with permissions', () => {
    it('should successfully add permissions', async () => {
      const updatedChopped = await giveBenAccessToChipotle();

      const existingPermissions = await tyranidGracl.PermissionsModel.find(
        {}, null, insecure
      );

      expect(existingPermissions).to.have.lengthOf(1);
      expect(existingPermissions[0]['resourceId'].toString(), 'resourceId')
        .to.equal(updatedChopped['permissions'][0]['resourceId'].toString());
      expect(existingPermissions[0]['subjectId'].toString(), 'subjectId')
        .to.equal(updatedChopped['permissions'][0]['subjectId'].toString());
      expect(existingPermissions[0]['access']['view-post'], 'access')
        .to.equal(updatedChopped['permissions'][0]['access']['view-post']);
    });


    it('should respect permissions hierarchy', async () => {
      await giveBenAccessToChipotle();

      const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            choppedBlog = await Tyr.byName['blog'].findOne({ name: 'Salads are great' });

      expect(ben, 'ben should exist').to.exist;
      expect(choppedBlog, 'choppedBlog should exist').to.exist;

      expect(
        await choppedBlog['$isAllowed']('view-post', ben),
        'ben should have access to choppedBlog through access to chopped org'
      ).to.equal(true);
    });


    it('should validate permissions', async () => {
      const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            chipotleCorporateBlog = await Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });

      expect(ben, 'ben should exist').to.exist;
      expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
      await expectAsyncToThrow(
        () => chipotleCorporateBlog['$isAllowed']('view', ben),
        /No collection name in permission type/g,
        'checking \'view\' without collection should throw'
      );
    });


    it('should create a lock when updating permission and set to false when complete', async () => {
      await giveBenAccessToChipotle();

      const locks = await tyranidGracl.PermissionLocks.find({}, null, insecure),
            chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

      expect(locks).to.have.lengthOf(1);
      expect(locks[0]['resourceId']).to.equal(chopped.$uid);
      expect(locks[0]['locked']).to.equal(false);
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
      await giveBenAccessToChipotle();

      const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

      expect(chopped['permissionIds']).to.have.lengthOf(1);

      expect(ben, 'ben should exist').to.exist;
      expect(chopped, 'chopped should exist').to.exist;

      const updatedChopped = await tyranidGracl
        .PermissionsModel
        .setPermissionAccess(chopped, 'view-user', true, ben);

      expect(updatedChopped['permissions']).to.have.lengthOf(1);

      const allPermissions = await tyranidGracl.PermissionsModel.find({});

      expect(allPermissions).to.have.lengthOf(1);
    });


    it('should successfully remove all permissions after PermissionsModel.deletePermissions()', async () => {
      const ted = await Tyr.byName['user'].findOne({ name: 'ted' }),
            ben = await Tyr.byName['user'].findOne({ name: 'ben' });

      const chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' }),
            cava = await Tyr.byName['organization'].findOne({ name: 'Cava' }),
            post = await Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' }),
            chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });

      expect(!ted['permissionIds']).to.equal(true);

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

      expect(ted['permissionIds']).to.have.lengthOf(1);

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

      await tyranidGracl.PermissionsModel.deletePermissions(ted);

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

      expect(updatedChopped['permissionIds']).to.have.length(0);
      expect(updatedCava['permissionIds']).to.have.length(0);
      expect(updatedPost['permissionIds']).to.have.length(0);
      expect(updatedChipotle['permissionIds']).to.have.length(0);
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
      await giveBenAccessToChipotle();

      const Post = Tyr.byName['post'],
            Blog = Tyr.byName['blog'],
            Org = Tyr.byName['organization'],
            ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            chopped = await Org.findOne({ name: 'Chopped' });

      const choppedBlogs = await Blog.find(
        { organizationId: chopped['_id'] },
        { _id: 1 },
        insecure
      );

      const query = await secure.query(Post, 'view', ben);

      expect(_.get(query, '$or.0'), 'query should find correct blogs').to.deep.equal({
        blogId: { $in: _.map(choppedBlogs, '_id') }
      });
    });

    it('should produce $and clause with excluded and included ids', async () => {
      const ted = await Tyr.byName['user'].findOne({ name: 'ted' }),
            ben = await Tyr.byName['user'].findOne({ name: 'ben' });

      const chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' }),
            cava = await Tyr.byName['organization'].findOne({ name: 'Cava' }),
            chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' }),
            cavaBlogs = await Tyr.byName['blog'].find({ organizationId: cava['_id'] }, null, insecure),
            chipotleBlogs = await Tyr.byName['blog'].find({ organizationId: chipotle['_id'] }, null, insecure),
            post = await Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' });

      const permissionOperations = await Promise.all([
        cava['$allow']('view-post', ted),
        post['$allow']('view-post', ted),
        chipotle['$deny']('view-post', ted)
      ]);

      const query = await secure.query(Tyr.byName['post'], 'view', ted);
      const [ positive, negative ] = <any[]> _.get(query, '$and');

      const _idRestriction = _.find(positive['$or'], v => _.contains(_.keys(v), '_id')),
            blogIdRestriction = _.find(positive['$or'], v => _.contains(_.keys(v), 'blogId'));

      expect(_idRestriction).to.deep.equal({
        '_id': {
          '$in': [
            post.$uid
          ]
        }
      });

      expect(blogIdRestriction).to.deep.equal({
        'blogId': {
          '$in': cavaBlogs.map(b => b['_id'])
        }
      });

      const blogIdNegative = _.find(negative['$and'], v => _.contains(_.keys(v), 'blogId'));

      expect(blogIdNegative).to.deep.equal({
        blogId: {
          $nin: chipotleBlogs.map(b => b['_id'])
        }
      });
    });

  });


  describe('Collection.find()', () => {
    it('should be appropriately filtered based on permissions', async () => {
      await giveBenAccessToChipotle();

      const Post = Tyr.byName['post'],
            User = Tyr.byName['user'],
            Blog = Tyr.byName['blog'],
            Org = Tyr.byName['organization'],
            ben = await User.findOne({ name: 'ben' });

      Tyr.local.user = ben;

      const postsBenCanSee = await Post.find({});

      const chopped = await Org.findOne({ name: 'Chopped' });

      const choppedBlogs = await Blog.find(
        { organizationId: chopped['_id'] },
        { _id: 1 },
        insecure
      );

      const choppedPosts = await Post.find({
        blogId: { $in: _.map(choppedBlogs, '_id') }
      }, null, insecure);

      expect(postsBenCanSee, 'ben should only see chopped posts').to.deep.equal(choppedPosts);
    });

    it('should default to lowest hierarchy permission', () => {
      console.warn('ADD TEST');
    });

  });


});
