/// <reference path='../../typings/main.d.ts' />
/// <reference path='../test-typings.d.ts'/>
import * as Tyr from 'tyranid';
import * as tpmongo from 'tpmongo';
import * as _ from 'lodash';
import * as tyranidGracl from '../../lib/index';
import { expect } from 'chai';
import { expectedLinkPaths } from './expectedLinkPaths';
import { createTestData } from './createTestData';


const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
      root = __dirname.replace(/test\/spec/, ''),
      secure = new tyranidGracl.GraclPlugin();


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
      console.warn('ADD TEST');
    });

    it('should find specific link using findLinkInCollection', () => {
      console.warn('ADD TEST');
    });

    it('should correctly create formatted queries using createInQueries', () => {
      console.warn('ADD TEST');
    });

    it('should return correct ids after calling stepThroughCollectionPath', () => {
      console.warn('ADD TEST');
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

    it('should add permissions methods to documents', () => {
      console.warn('ADD TEST');
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
        {}, null, { tyranid: { insecure: true } }
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

      let threw = false,
          message = '';
      try {
        await chipotleCorporateBlog['$isAllowed']('view', ben);
      } catch (err) {
        threw = true;
        message = err.message;
      }

      expect(threw,
        'checking \"view\" without collection should throw'
      ).to.equal(true);

      expect(message, `Error message should contain \"No collection name in permission type\"`)
        .to.match(/No collection name in permission type/g);
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
        { tyranid: { insecure: true } }
      );

      const query = await secure.query(Post, 'view', ben);

      expect(query, 'query should find correct blogs').to.deep.equal({
        blogId: { $in: _.map(choppedBlogs, '_id') }
      });
    });

    it('should produce query with primaryKey field set if permissions are directly set for collection', async () => {
      console.warn('ADD TEST');
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
        { tyranid: { insecure: true } }
      );

      const choppedPosts = await Post.find({
        blogId: { $in: _.map(choppedBlogs, '_id') }
      }, null, { tyranid: { insecure: true } });

      expect(postsBenCanSee, 'ben should only see chopped posts').to.deep.equal(choppedPosts);
    });

    it('should default to lowest hierarchy permission', () => {
      console.warn('ADD TEST');
    });

  });


});
