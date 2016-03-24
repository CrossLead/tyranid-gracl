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

      expect(query['_id'], 'should correctly map own _id field').to.deep.equal({ $in: chartIds });
      expect(query['blogId'], 'should find correct property').to.deep.equal({ $in: blogIds });
      expect(query['userIds'], 'should find correct property').to.deep.equal({ $in: userIds });

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

      expectAsyncToThrow(
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
      const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
            chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

      expect(ben, 'ben should exist').to.exist;
      expect(chopped, 'chopped should exist').to.exist;

      const updatedChopped = await tyranidGracl
        .PermissionsModel
        .setPermissionAccess(chopped, 'view-post', true, ben);

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
      expectAsyncToThrow(
        () => chipotleCorporateBlog['$isAllowed']('view', ben),
        /No collection name in permission type/g,
        'checking \'view\' without collection should throw'
      );
    });


    it('should create a lock when updating permission and set to false when complete', async () => {
      const locks = await tyranidGracl.PermissionLocks.find({}, null, insecure),
            chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

      expect(locks.length).to.be.greaterThan(0);
      expect(locks[0]['resourceId']).to.equal(chopped.$uid);
      expect(locks[0]['locked']).to.equal(false);
    });


    it('should throw error when trying to lock same resource twice', async() => {
      const chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });
      await tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle);
      expectAsyncToThrow(
        () => tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle),
        /another update is in progress/,
        'cannot lock resource that is already locked'
      );
      await tyranidGracl.PermissionsModel.unlockPermissionsForResource(chipotle);
    });


    it('should modify existing permissions instead of creating new ones', async () => {
      console.warn('ADD TEST');
    });


    it('should successfully remove all permissions after PermissionsModel.deletePermissions()', async () => {
      console.warn('ADD TEST');
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

      expect(query, 'query should find correct blogs').to.deep.equal({
        blogId: { $in: _.map(choppedBlogs, '_id') }
      });
    });

    it('should produce $and clause with excluded and included ids', () => {
      console.warn('ADD TEST');
    });

  });


  describe('Collection.find()', () => {
    it('should be appropriately filtered based on permissions', async () => {
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
