"use strict";

var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }
        function rejected(value) {
            try {
                step(generator.throw(value));
            } catch (e) {
                reject(e);
            }
        }
        function step(result) {
            result.done ? resolve(result.value) : new P(function (resolve) {
                resolve(result.value);
            }).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Tyr = require('tyranid');
const tpmongo = require('tpmongo');
const _ = require('lodash');
const tyranidGracl = require('../../lib/index');
const chai_1 = require('chai');
const expectedLinkPaths_1 = require('../helpers/expectedLinkPaths');
const createTestData_1 = require('../helpers/createTestData');
const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
      root = __dirname.replace(/test\/spec/, ''),
      secure = new tyranidGracl.GraclPlugin();
describe('tyranid-gracl', () => {
    before(() => __awaiter(undefined, void 0, void 0, function* () {
        Tyr.config({
            db: db,
            validate: [{ dir: root + '/test/models', fileMatch: '[a-z].js' }, { dir: root + '/lib/models', fileMatch: '[a-z].js' }],
            secure: secure,
            cls: false
        });
        yield createTestData_1.createTestData();
    }));
    beforeEach(() => __awaiter(undefined, void 0, void 0, function* () {
        Tyr.local.user = undefined;
    }));
    describe('utility functions', () => {
        it('should correctly find links using getCollectionLinksSorted', () => {
            const Chart = Tyr.byName['chart'],
                  options = { direction: 'outgoing' },
                  links = tyranidGracl.getCollectionLinksSorted(Chart, options);
            chai_1.expect(links, 'should produce sorted links').to.deep.equal(_.sortBy(Chart.links(options), field => field.link.def.name));
        });
        it('should find specific link using findLinkInCollection', () => {
            const Chart = Tyr.byName['chart'],
                  User = Tyr.byName['user'],
                  linkField = tyranidGracl.findLinkInCollection(Chart, User);
            chai_1.expect(linkField).to.exist;
            chai_1.expect(linkField.link.def.name).to.equal('user');
            chai_1.expect(linkField.spath).to.equal('userIds');
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
            for (const a in expectedLinkPaths_1.expectedLinkPaths) {
                for (const b in expectedLinkPaths_1.expectedLinkPaths[a]) {
                    chai_1.expect(secure.getShortestPath(Tyr.byName[a], Tyr.byName[b]), `Path from ${ a } to ${ b }`).to.deep.equal(expectedLinkPaths_1.expectedLinkPaths[a][b] || []);
                }
            }
        });
        it('should add permissions methods to documents', () => __awaiter(undefined, void 0, void 0, function* () {
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' });
            chai_1.expect(ben, 'should have method: $isAllowed').to.have.property('$isAllowed');
            chai_1.expect(ben, 'should have method: $setPermissionAccess').to.have.property('$setPermissionAccess');
            chai_1.expect(ben, 'should have method: $allow').to.have.property('$allow');
            chai_1.expect(ben, 'should have method: $deny').to.have.property('$deny');
        }));
    });
    describe('Working with permissions', () => {
        it('should successfully add permissions', () => __awaiter(undefined, void 0, void 0, function* () {
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }),
                  chopped = yield Tyr.byName['organization'].findOne({ name: 'Chopped' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chopped, 'chopped should exist').to.exist;
            const updatedChopped = yield tyranidGracl.PermissionsModel.setPermissionAccess(chopped, 'view-post', true, ben);
            const existingPermissions = yield tyranidGracl.PermissionsModel.find({}, null, { tyranid: { insecure: true } });
            chai_1.expect(existingPermissions).to.have.lengthOf(1);
            chai_1.expect(existingPermissions[0]['resourceId'].toString(), 'resourceId').to.equal(updatedChopped['permissions'][0]['resourceId'].toString());
            chai_1.expect(existingPermissions[0]['subjectId'].toString(), 'subjectId').to.equal(updatedChopped['permissions'][0]['subjectId'].toString());
            chai_1.expect(existingPermissions[0]['access']['view-post'], 'access').to.equal(updatedChopped['permissions'][0]['access']['view-post']);
        }));
        it('should respect permissions hierarchy', () => __awaiter(undefined, void 0, void 0, function* () {
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }),
                  choppedBlog = yield Tyr.byName['blog'].findOne({ name: 'Salads are great' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(choppedBlog, 'choppedBlog should exist').to.exist;
            chai_1.expect((yield choppedBlog['$isAllowed']('view-post', ben)), 'ben should have access to choppedBlog through access to chopped org').to.equal(true);
        }));
        it('should validate permissions', () => __awaiter(undefined, void 0, void 0, function* () {
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }),
                  chipotleCorporateBlog = yield Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
            let threw = false,
                message = '';
            try {
                yield chipotleCorporateBlog['$isAllowed']('view', ben);
            } catch (err) {
                threw = true;
                message = err.message;
            }
            chai_1.expect(threw, 'checking \"view\" without collection should throw').to.equal(true);
            chai_1.expect(message, `Error message should contain \"No collection name in permission type\"`).to.match(/No collection name in permission type/g);
        }));
        it('should lock permissions for resource while update in progress', () => __awaiter(undefined, void 0, void 0, function* () {
            console.warn('ADD TEST');
        }));
        it('should modify existing permissions instead of creating new ones', () => __awaiter(undefined, void 0, void 0, function* () {
            console.warn('ADD TEST');
        }));
        it('should successfully remove all permissions after PermissionsModel.deletePermissions()', () => __awaiter(undefined, void 0, void 0, function* () {
            console.warn('ADD TEST');
        }));
    });
    describe('plugin.query()', () => {
        it('should return false with no user', () => __awaiter(undefined, void 0, void 0, function* () {
            const Post = Tyr.byName['post'],
                  query = yield secure.query(Post, 'view');
            chai_1.expect(query, 'query should be false').to.equal(false);
        }));
        it('should return empty object for collection with no permissions hierarchy node', () => __awaiter(undefined, void 0, void 0, function* () {
            const Chart = Tyr.byName['chart'],
                  ben = yield Tyr.byName['user'].findOne({ name: 'ben' }),
                  query = yield secure.query(Chart, 'view', ben);
            chai_1.expect(query, 'query should be {}').to.deep.equal({});
        }));
        it('should produce query restriction based on permissions', () => __awaiter(undefined, void 0, void 0, function* () {
            const Post = Tyr.byName['post'],
                  Blog = Tyr.byName['blog'],
                  Org = Tyr.byName['organization'],
                  ben = yield Tyr.byName['user'].findOne({ name: 'ben' }),
                  chopped = yield Org.findOne({ name: 'Chopped' });
            const choppedBlogs = yield Blog.find({ organizationId: chopped['_id'] }, { _id: 1 }, { tyranid: { insecure: true } });
            const query = yield secure.query(Post, 'view', ben);
            chai_1.expect(query, 'query should find correct blogs').to.deep.equal({
                blogId: { $in: _.map(choppedBlogs, '_id') }
            });
        }));
        it('should produce query with primaryKey field set if permissions are directly set for collection', () => __awaiter(undefined, void 0, void 0, function* () {
            console.warn('ADD TEST');
        }));
        it('should produce $and clause with excluded and included ids', () => {
            console.warn('ADD TEST');
        });
    });
    describe('Collection.find()', () => {
        it('should be appropriately filtered based on permissions', () => __awaiter(undefined, void 0, void 0, function* () {
            const Post = Tyr.byName['post'],
                  User = Tyr.byName['user'],
                  Blog = Tyr.byName['blog'],
                  Org = Tyr.byName['organization'],
                  ben = yield User.findOne({ name: 'ben' });
            Tyr.local.user = ben;
            const postsBenCanSee = yield Post.find({});
            const chopped = yield Org.findOne({ name: 'Chopped' });
            const choppedBlogs = yield Blog.find({ organizationId: chopped['_id'] }, { _id: 1 }, { tyranid: { insecure: true } });
            const choppedPosts = yield Post.find({
                blogId: { $in: _.map(choppedBlogs, '_id') }
            }, null, { tyranid: { insecure: true } });
            chai_1.expect(postsBenCanSee, 'ben should only see chopped posts').to.deep.equal(choppedPosts);
        }));
        it('should default to lowest hierarchy permission', () => {
            console.warn('ADD TEST');
        });
    });
});