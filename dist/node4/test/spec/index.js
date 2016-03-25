"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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
const tyranid_1 = require('tyranid');
const tpmongo = require('tpmongo');
const _ = require('lodash');
const tyranidGracl = require('../../lib/index');
const chai_1 = require('chai');
const expectedLinkPaths_1 = require('../helpers/expectedLinkPaths');
const createTestData_1 = require('../helpers/createTestData');
const expectAsyncToThrow_1 = require('../helpers/expectAsyncToThrow');
const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
      root = __dirname.replace(/test\/spec/, ''),
      secure = new tyranidGracl.GraclPlugin({
    verbose: false
});
const checkStringEq = function checkStringEq(got, want) {
    let message = arguments.length <= 2 || arguments[2] === undefined ? '' : arguments[2];

    chai_1.expect(_.map(got, s => s.toString()), message).to.deep.equal(_.map(want, s => s.toString()));
};
function giveBenAccessToChoppedPosts() {
    let perm = arguments.length <= 0 || arguments[0] === undefined ? 'view' : arguments[0];

    return __awaiter(this, void 0, void 0, function* () {
        const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }),
              chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' });
        chai_1.expect(ben, 'ben should exist').to.exist;
        chai_1.expect(chopped, 'chopped should exist').to.exist;
        const updatedChopped = secure.setPermissionAccess(chopped, `${ perm }-post`, true, ben);
        return updatedChopped;
    });
}
describe('tyranid-gracl', () => {
    before(() => __awaiter(undefined, void 0, void 0, function* () {
        tyranid_1.default.config({
            db: db,
            validate: [{ dir: root + '/test/models',
                fileMatch: '[a-z].js' }],
            secure: secure,
            cls: false
        });
        yield createTestData_1.createTestData();
    }));
    beforeEach(() => __awaiter(undefined, void 0, void 0, function* () {
        yield createTestData_1.createTestData();
    }));
    describe('utility functions', () => {
        it('should correctly find links using getCollectionLinksSorted', () => {
            const Chart = tyranid_1.default.byName['chart'],
                  options = { direction: 'outgoing' },
                  links = tyranidGracl.getCollectionLinksSorted(Chart, options);
            chai_1.expect(links, 'should produce sorted links').to.deep.equal(_.sortBy(Chart.links(options), field => field.link.def.name));
        });
        it('should find specific link using findLinkInCollection', () => {
            const Chart = tyranid_1.default.byName['chart'],
                  User = tyranid_1.default.byName['user'],
                  linkField = tyranidGracl.findLinkInCollection(Chart, User);
            chai_1.expect(linkField).to.exist;
            chai_1.expect(linkField.link.def.name).to.equal('user');
            chai_1.expect(linkField.spath).to.equal('userIds');
        });
        it('should correctly create formatted queries using createInQueries', () => __awaiter(undefined, void 0, void 0, function* () {
            const getIdsForCol = col => __awaiter(this, void 0, void 0, function* () {
                return _.map((yield tyranid_1.default.byName[col].find({})), '_id');
            });
            const blogIds = yield getIdsForCol('blog'),
                  userIds = yield getIdsForCol('user'),
                  chartIds = yield getIdsForCol('chart');
            const queryAgainstChartMap = new Map([['blog', new Set(blogIds)], ['user', new Set(userIds)], ['chart', new Set(chartIds)]]);
            const query = tyranidGracl.createInQueries(queryAgainstChartMap, tyranid_1.default.byName['chart'], '$in');
            const _idRestriction = _.find(query['$or'], v => _.contains(_.keys(v), '_id')),
                  blogIdRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'blogId')),
                  userIdsRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'userIds'));
            checkStringEq(_idRestriction['_id']['$in'], chartIds, 'should correctly map own _id field');
            checkStringEq(blogIdRestriction['blogId']['$in'], blogIds, 'should find correct property');
            checkStringEq(userIdsRestriction['userIds']['$in'], userIds, 'should find correct property');
            const createQueryNoLink = () => {
                tyranidGracl.createInQueries(queryAgainstChartMap, tyranid_1.default.byName['organization'], '$in');
            };
            chai_1.expect(createQueryNoLink, 'creating query for collection with no outgoing link to mapped collection').to.throw(/No outgoing link/);
        }));
        it('should return correct ids after calling stepThroughCollectionPath', () => __awaiter(undefined, void 0, void 0, function* () {
            const chipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' }),
                  chipotleBlogs = yield tyranid_1.default.byName['blog'].find({ organizationId: chipotle.$id }),
                  blogIds = _.map(chipotleBlogs, '_id'),
                  chipotlePosts = yield tyranid_1.default.byName['post'].find({ blogId: { $in: blogIds } }),
                  postIds = _.map(chipotlePosts, '_id');
            const steppedPostIds = yield tyranidGracl.stepThroughCollectionPath(blogIds, tyranid_1.default.byName['blog'], tyranid_1.default.byName['post']);
            checkStringEq(steppedPostIds, postIds, 'ids after stepping should be all relevant ids');
            yield expectAsyncToThrow_1.expectAsyncToThrow(() => tyranidGracl.stepThroughCollectionPath(blogIds, tyranid_1.default.byName['blog'], tyranid_1.default.byName['user']), /cannot step through collection path, as no link to collection/, 'stepping to a collection with no connection to previous col should throw');
        }));
    });
    describe('Creating the plugin', () => {
        it('should correctly produce paths between collections', () => {
            for (const a in expectedLinkPaths_1.expectedLinkPaths) {
                for (const b in expectedLinkPaths_1.expectedLinkPaths[a]) {
                    chai_1.expect(secure.getShortestPath(tyranid_1.default.byName[a], tyranid_1.default.byName[b]), `Path from ${ a } to ${ b }`).to.deep.equal(expectedLinkPaths_1.expectedLinkPaths[a][b] || []);
                }
            }
        });
        it('should add permissions methods to documents', () => __awaiter(undefined, void 0, void 0, function* () {
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' });
            chai_1.expect(ben, 'should have method: $setPermissionAccess').to.have.property('$setPermissionAccess');
            chai_1.expect(ben, 'should have method: $isAllowed').to.have.property('$isAllowed');
            chai_1.expect(ben, 'should have method: $allow').to.have.property('$allow');
            chai_1.expect(ben, 'should have method: $deny').to.have.property('$deny');
            chai_1.expect(ben, 'should have method: $isAllowedForThis').to.have.property('$isAllowedForThis');
            chai_1.expect(ben, 'should have method: $allowForThis').to.have.property('$allowForThis');
            chai_1.expect(ben, 'should have method: $denyForThis').to.have.property('$denyForThis');
        }));
        it('should create subject and resource classes for collections without links in or out', () => {
            chai_1.expect(secure.graclHierarchy.resources.has('usagelog')).to.equal(true);
            chai_1.expect(secure.graclHierarchy.subjects.has('usagelog')).to.equal(true);
        });
    });
    describe('Working with permissions', () => {
        it('should successfully add permissions', () => __awaiter(undefined, void 0, void 0, function* () {
            const updatedChopped = yield giveBenAccessToChoppedPosts();
            const existingPermissions = yield tyranid_1.default.byName['graclPermission'].find({});
            chai_1.expect(existingPermissions).to.have.lengthOf(1);
            chai_1.expect(existingPermissions[0]['resourceId'].toString(), 'resourceId').to.equal(updatedChopped['permissions'][0]['resourceId'].toString());
            chai_1.expect(existingPermissions[0]['subjectId'].toString(), 'subjectId').to.equal(updatedChopped['permissions'][0]['subjectId'].toString());
            chai_1.expect(existingPermissions[0]['access']['view-post'], 'access').to.equal(updatedChopped['permissions'][0]['access']['view-post']);
        }));
        it('should respect subject / resource hierarchy', () => __awaiter(undefined, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }),
                  choppedBlog = yield tyranid_1.default.byName['blog'].findOne({ name: 'Salads are great' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(choppedBlog, 'choppedBlog should exist').to.exist;
            chai_1.expect((yield choppedBlog['$isAllowed']('view-post', ben)), 'ben should have access to choppedBlog through access to chopped org').to.equal(true);
        }));
        it('should respect permissions hierarchy', () => __awaiter(undefined, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts('edit');
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }),
                  choppedBlog = yield tyranid_1.default.byName['blog'].findOne({ name: 'Salads are great' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(choppedBlog, 'choppedBlog should exist').to.exist;
            chai_1.expect((yield choppedBlog['$isAllowed']('view-post', ben)), 'ben should have \'view\' access to choppedBlog through \'edit\' access to chopped org').to.equal(true);
        }));
        it('should validate permissions', () => __awaiter(undefined, void 0, void 0, function* () {
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }),
                  chipotleCorporateBlog = yield tyranid_1.default.byName['blog'].findOne({ name: 'Mexican Empire' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
            yield expectAsyncToThrow_1.expectAsyncToThrow(() => chipotleCorporateBlog['$isAllowed']('view', ben), /No collection name in permission type/g, 'checking \'view\' without collection should throw');
        }));
        it('should create a lock when updating permission and set to false when complete', () => __awaiter(undefined, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const locks = yield tyranidGracl.PermissionLocks.find({}),
                  chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' });
            chai_1.expect(locks).to.have.lengthOf(1);
            chai_1.expect(locks[0]['resourceId']).to.equal(chopped.$uid);
            chai_1.expect(locks[0]['locked']).to.equal(false);
        }));
        it('should throw error when trying to lock same resource twice', () => __awaiter(undefined, void 0, void 0, function* () {
            const chipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' });
            yield tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle);
            yield expectAsyncToThrow_1.expectAsyncToThrow(() => tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle), /another update is in progress/, 'cannot lock resource that is already locked');
            yield tyranidGracl.PermissionsModel.unlockPermissionsForResource(chipotle);
        }));
        it('should modify existing permissions instead of creating new ones', () => __awaiter(undefined, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }),
                  chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' });
            chai_1.expect(chopped['permissionIds']).to.have.lengthOf(1);
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chopped, 'chopped should exist').to.exist;
            const updatedChopped = yield secure.setPermissionAccess(chopped, 'view-user', true, ben);
            chai_1.expect(updatedChopped['permissions']).to.have.lengthOf(1);
            const allPermissions = yield tyranidGracl.PermissionsModel.find({});
            chai_1.expect(allPermissions).to.have.lengthOf(1);
        }));
        it('should successfully remove all permissions after secure.deletePermissions()', () => __awaiter(undefined, void 0, void 0, function* () {
            const ted = yield tyranid_1.default.byName['user'].findOne({ name: 'ted' }),
                  ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' });
            const chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' }),
                  cava = yield tyranid_1.default.byName['organization'].findOne({ name: 'Cava' }),
                  post = yield tyranid_1.default.byName['post'].findOne({ text: 'Why burritos are amazing.' }),
                  chipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' });
            chai_1.expect(!ted['permissionIds']).to.equal(true);
            const permissionsForTed = yield tyranid_1.default.byName['graclPermission'].find({
                $or: [{ subjectId: ted.$uid }, { resourceId: ted.$uid }]
            });
            chai_1.expect(permissionsForTed).to.have.lengthOf(0);
            const prePermissionChecks = yield Promise.all([chopped['$isAllowed']('view-user', ted), cava['$isAllowed']('view-post', ted), post['$isAllowed']('edit-post', ted), ted['$isAllowed']('view-user', ben), chipotle['$isAllowed']('view-post', ted)]);
            chai_1.expect(_.all(prePermissionChecks)).to.equal(false);
            const permissionOperations = yield Promise.all([chopped['$allow']('view-user', ted), cava['$allow']('view-post', ted), post['$allow']('edit-post', ted), chipotle['$deny']('view-post', ted), ted['$allow']('view-user', ben)]);
            const updatedTed = yield tyranid_1.default.byName['user'].findOne({ name: 'ted' });
            chai_1.expect(ted['permissionIds']).to.have.lengthOf(1);
            const updatedPermissionsForTed = yield tyranid_1.default.byName['graclPermission'].find({
                $or: [{ subjectId: ted.$uid }, { resourceId: ted.$uid }]
            });
            chai_1.expect(updatedPermissionsForTed).to.have.lengthOf(permissionOperations.length);
            const permissionChecks = yield Promise.all([chopped['$isAllowed']('view-user', ted), cava['$isAllowed']('view-post', ted), post['$isAllowed']('edit-post', ted), ted['$isAllowed']('view-user', ben)]);
            chai_1.expect(_.all(permissionChecks)).to.equal(true);
            chai_1.expect((yield chipotle['$isAllowed']('view-post', ted))).to.equal(false);
            yield secure.deletePermissions(ted);
            const postPermissionChecks = yield Promise.all([chopped['$isAllowed']('view-user', ted), cava['$isAllowed']('view-post', ted), post['$isAllowed']('edit-post', ted), ted['$isAllowed']('view-user', ben)]);
            chai_1.expect(_.all(postPermissionChecks)).to.equal(false);
            const updatedChopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' }),
                  updatedCava = yield tyranid_1.default.byName['organization'].findOne({ name: 'Cava' }),
                  updatedPost = yield tyranid_1.default.byName['post'].findOne({ text: 'Why burritos are amazing.' }),
                  updatedChipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' });
            chai_1.expect(updatedChopped['permissionIds']).to.have.length(0);
            chai_1.expect(updatedCava['permissionIds']).to.have.length(0);
            chai_1.expect(updatedPost['permissionIds']).to.have.length(0);
            chai_1.expect(updatedChipotle['permissionIds']).to.have.length(0);
        }));
    });
    describe('plugin.query()', () => {
        it('should return false with no user', () => __awaiter(undefined, void 0, void 0, function* () {
            const Post = tyranid_1.default.byName['post'],
                  query = yield secure.query(Post, 'view');
            chai_1.expect(query, 'query should be false').to.equal(false);
        }));
        it('should return empty object for collection with no permissions hierarchy node', () => __awaiter(undefined, void 0, void 0, function* () {
            const Chart = tyranid_1.default.byName['chart'],
                  ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }),
                  query = yield secure.query(Chart, 'view', ben);
            chai_1.expect(query, 'query should be {}').to.deep.equal({});
        }));
        it('should produce query restriction based on permissions', () => __awaiter(undefined, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const Post = tyranid_1.default.byName['post'],
                  Blog = tyranid_1.default.byName['blog'],
                  Org = tyranid_1.default.byName['organization'],
                  ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }),
                  chopped = yield Org.findOne({ name: 'Chopped' });
            const choppedBlogs = yield Blog.find({ organizationId: chopped.$id }, { _id: 1 });
            const query = yield secure.query(Post, 'view', ben);
            checkStringEq(_.get(query, '$or.0.blogId.$in'), _.map(choppedBlogs, '_id'), 'query should find correct blogs');
        }));
        it('should produce $and clause with excluded and included ids', () => __awaiter(undefined, void 0, void 0, function* () {
            const ted = yield tyranid_1.default.byName['user'].findOne({ name: 'ted' }),
                  ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' });
            const chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' }),
                  cava = yield tyranid_1.default.byName['organization'].findOne({ name: 'Cava' }),
                  chipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' }),
                  cavaBlogs = yield tyranid_1.default.byName['blog'].find({ organizationId: cava.$id }),
                  chipotleBlogs = yield tyranid_1.default.byName['blog'].find({ organizationId: chipotle.$id }),
                  post = yield tyranid_1.default.byName['post'].findOne({ text: 'Why burritos are amazing.' });
            const permissionOperations = yield Promise.all([cava['$allow']('view-post', ted), post['$allow']('view-post', ted), chipotle['$deny']('view-post', ted)]);
            const query = yield secure.query(tyranid_1.default.byName['post'], 'view', ted);

            var _$get = _.get(query, '$and');

            var _$get2 = _slicedToArray(_$get, 2);

            const positive = _$get2[0];
            const negative = _$get2[1];

            const _idRestriction = _.find(positive['$or'], v => _.contains(_.keys(v), '_id')),
                  blogIdRestriction = _.find(positive['$or'], v => _.contains(_.keys(v), 'blogId')),
                  blogIdNegative = _.find(negative['$and'], v => _.contains(_.keys(v), 'blogId'));
            checkStringEq(_.get(_idRestriction, '_id.$in'), [post.$id]);
            checkStringEq(_.get(blogIdRestriction, 'blogId.$in'), cavaBlogs.map(b => b.$id));
            checkStringEq(_.get(blogIdNegative, 'blogId.$nin'), chipotleBlogs.map(b => b.$id));
        }));
    });
    describe('Collection.find()', () => {
        it('should be appropriately filtered based on permissions', () => __awaiter(undefined, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const Post = tyranid_1.default.byName['post'],
                  User = tyranid_1.default.byName['user'],
                  Blog = tyranid_1.default.byName['blog'],
                  Org = tyranid_1.default.byName['organization'],
                  ben = yield User.findOne({ name: 'ben' });
            const postsBenCanSee = yield Post.find({}, null, { tyranid: { secure: true, user: ben } });
            const chopped = yield Org.findOne({ name: 'Chopped' });
            const choppedBlogs = yield Blog.find({ organizationId: chopped.$id }, { _id: 1 });
            const choppedPosts = yield Post.find({
                blogId: { $in: _.map(choppedBlogs, '_id') }
            });
            checkStringEq(_.map(postsBenCanSee, '_id'), _.map(choppedPosts, '_id'), 'ben should only see chopped posts');
        }));
        it('should default to lowest hierarchy permission', () => __awaiter(undefined, void 0, void 0, function* () {
            const chopped = yield giveBenAccessToChoppedPosts(),
                  ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }),
                  post = yield tyranid_1.default.byName['post'].findOne({ text: 'Salads are great, the post.' }),
                  choppedBlogs = yield tyranid_1.default.byName['blog'].find({ organizationId: chopped.$id }),
                  choppedPosts = yield tyranid_1.default.byName['post'].find({ blogId: { $in: choppedBlogs.map(b => b.$id) } });
            chai_1.expect(choppedPosts).to.have.lengthOf(2);
            chai_1.expect(_.map(choppedPosts, '$id')).to.contain(post.$id);
            yield post['$deny']('view-post', ben);
            const postsBenCanSee = yield tyranid_1.default.byName['post'].find({}, null, { tyranid: { secure: true, user: ben } });
            chai_1.expect(postsBenCanSee).to.have.lengthOf(1);
            chai_1.expect(_.map(postsBenCanSee, '$id')).to.not.contain(post.$id);
        }));
    });
});