"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
const permissionKey = 'graclResourcePermissions', db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []), root = __dirname.replace(/test\/spec/, ''), secure = new tyranidGracl.GraclPlugin({
    verbose: false,
    permissionProperty: permissionKey,
    permissionTypes: [
        { name: 'edit', abstract: false },
        { name: 'view', parent: 'edit', abstract: false },
        { name: 'delete', abstract: false },
        { name: 'abstract_view_chart', abstract: true, parents: [
                'view-user',
                'view-post'
            ] },
        { name: 'view_alignment_triangle', abstract: true, parents: [
                'edit_alignment_triangle',
                'view_alignment_triangle_component'
            ] },
        { name: 'edit_alignment_triangle', abstract: true },
        { name: 'view_alignment_triangle_component', abstract: true }
    ]
});
const checkStringEq = (got, want, message = '') => {
    chai_1.expect(_.map(got, s => s.toString()), message)
        .to.deep.equal(_.map(want, s => s.toString()));
};
function giveBenAccessToChoppedPosts(perm = 'view') {
    return __awaiter(this, void 0, void 0, function* () {
        const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' });
        chai_1.expect(ben, 'ben should exist').to.exist;
        chai_1.expect(chopped, 'chopped should exist').to.exist;
        const updatedChopped = secure.setPermissionAccess(chopped, `${perm}-post`, true, ben);
        return updatedChopped;
    });
}
describe('tyranid-gracl', () => {
    before(() => __awaiter(this, void 0, void 0, function* () {
        tyranid_1.default.config({
            db: db,
            validate: [
                { dir: root + '/test/models',
                    fileMatch: '[a-z].js' }
            ],
            secure: secure,
            cls: false
        });
        yield createTestData_1.createTestData();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield createTestData_1.createTestData();
    }));
    describe('utility functions', () => {
        it('should correctly find links using getCollectionLinksSorted', () => {
            const Chart = tyranid_1.default.byName['chart'], options = { direction: 'outgoing' }, links = tyranidGracl.getCollectionLinksSorted(Chart, options);
            chai_1.expect(links, 'should produce sorted links')
                .to.deep.equal(_.sortBy(Chart.links(options), field => field.link.def.name));
        });
        it('should find specific link using findLinkInCollection', () => {
            const Chart = tyranid_1.default.byName['chart'], User = tyranid_1.default.byName['user'], linkField = tyranidGracl.findLinkInCollection(Chart, User);
            chai_1.expect(linkField).to.exist;
            chai_1.expect(linkField.link.def.name).to.equal('user');
            chai_1.expect(linkField.spath).to.equal('userIds');
        });
        it('should correctly create formatted queries using createInQueries', () => __awaiter(this, void 0, void 0, function* () {
            const getIdsForCol = (col) => __awaiter(this, void 0, void 0, function* () {
                return _.map(yield tyranid_1.default.byName[col].find({}), '_id');
            });
            const blogIds = yield getIdsForCol('blog'), userIds = yield getIdsForCol('user'), chartIds = yield getIdsForCol('chart');
            const queryAgainstChartMap = new Map([
                ['blog', new Set(blogIds)],
                ['user', new Set(userIds)],
                ['chart', new Set(chartIds)]
            ]);
            const query = tyranidGracl.createInQueries(queryAgainstChartMap, tyranid_1.default.byName['chart'], '$in');
            const _idRestriction = _.find(query['$or'], v => _.contains(_.keys(v), '_id')), blogIdRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'blogId')), userIdsRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'userIds'));
            checkStringEq(_idRestriction['_id']['$in'], chartIds, 'should correctly map own _id field');
            checkStringEq(blogIdRestriction['blogId']['$in'], blogIds, 'should find correct property');
            checkStringEq(userIdsRestriction['userIds']['$in'], userIds, 'should find correct property');
            const createQueryNoLink = () => {
                tyranidGracl.createInQueries(queryAgainstChartMap, tyranid_1.default.byName['organization'], '$in');
            };
            chai_1.expect(createQueryNoLink, 'creating query for collection with no outgoing link to mapped collection')
                .to.throw(/No outgoing link/);
        }));
        it('should return correct ids after calling stepThroughCollectionPath', () => __awaiter(this, void 0, void 0, function* () {
            const chipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' }), chipotleBlogs = yield tyranid_1.default.byName['blog'].find({ organizationId: chipotle.$id }), blogIds = _.map(chipotleBlogs, '_id'), chipotlePosts = yield tyranid_1.default.byName['post'].find({ blogId: { $in: blogIds } }), postIds = _.map(chipotlePosts, '_id');
            const steppedPostIds = yield tyranidGracl.stepThroughCollectionPath(blogIds, tyranid_1.default.byName['blog'], tyranid_1.default.byName['post']);
            checkStringEq(steppedPostIds, postIds, 'ids after stepping should be all relevant ids');
            yield expectAsyncToThrow_1.expectAsyncToThrow(() => tyranidGracl.stepThroughCollectionPath(blogIds, tyranid_1.default.byName['blog'], tyranid_1.default.byName['user']), /cannot step through collection path, as no link to collection/, 'stepping to a collection with no connection to previous col should throw');
        }));
    });
    describe('Creating the plugin', () => {
        it('should correctly produce paths between collections', () => {
            for (const a in expectedLinkPaths_1.expectedLinkPaths) {
                for (const b in expectedLinkPaths_1.expectedLinkPaths[a]) {
                    chai_1.expect(secure.getShortestPath(tyranid_1.default.byName[a], tyranid_1.default.byName[b]), `Path from ${a} to ${b}`)
                        .to.deep.equal(expectedLinkPaths_1.expectedLinkPaths[a][b] || []);
                }
            }
        });
        it('should add permissions methods to documents', () => __awaiter(this, void 0, void 0, function* () {
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' });
            chai_1.expect(ben, 'should have method: $setPermissionAccess').to.have.property('$setPermissionAccess');
            chai_1.expect(ben, 'should have method: $isAllowed').to.have.property('$isAllowed');
            chai_1.expect(ben, 'should have method: $allow').to.have.property('$allow');
            chai_1.expect(ben, 'should have method: $deny').to.have.property('$deny');
            chai_1.expect(ben, 'should have method: $isAllowedForThis').to.have.property('$isAllowedForThis');
            chai_1.expect(ben, 'should have method: $allowForThis').to.have.property('$allowForThis');
            chai_1.expect(ben, 'should have method: $denyForThis').to.have.property('$denyForThis');
            chai_1.expect(ben, 'should have method: $explainPermission').to.have.property('$explainPermission');
        }));
        it('should create subject and resource classes for collections without links in or out', () => {
            chai_1.expect(secure.graclHierarchy.resources.has('usagelog')).to.equal(true);
            chai_1.expect(secure.graclHierarchy.subjects.has('usagelog')).to.equal(true);
        });
    });
    describe('Working with permissions', () => {
        it('should successfully add permissions', () => __awaiter(this, void 0, void 0, function* () {
            const updatedChopped = yield giveBenAccessToChoppedPosts();
            const existingPermissions = yield tyranid_1.default.byName['graclPermission'].find({});
            chai_1.expect(existingPermissions).to.have.lengthOf(1);
            chai_1.expect(existingPermissions[0]['resourceId'].toString(), 'resourceId')
                .to.equal(updatedChopped[permissionKey][0]['resourceId'].toString());
            chai_1.expect(existingPermissions[0]['subjectId'].toString(), 'subjectId')
                .to.equal(updatedChopped[permissionKey][0]['subjectId'].toString());
            chai_1.expect(existingPermissions[0]['access']['view-post'], 'access')
                .to.equal(updatedChopped[permissionKey][0]['access']['view-post']);
        }));
        it('should respect subject / resource hierarchy', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), choppedBlog = yield tyranid_1.default.byName['blog'].findOne({ name: 'Salads are great' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(choppedBlog, 'choppedBlog should exist').to.exist;
            chai_1.expect(yield choppedBlog['$isAllowed']('view-post', ben), 'ben should have access to choppedBlog through access to chopped org').to.equal(true);
        }));
        it('should respect permissions hierarchy', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts('edit');
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), choppedBlog = yield tyranid_1.default.byName['blog'].findOne({ name: 'Salads are great' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(choppedBlog, 'choppedBlog should exist').to.exist;
            chai_1.expect(yield choppedBlog['$isAllowed']('view-post', ben), 'ben should have \'view\' access to choppedBlog through \'edit\' access to chopped org').to.equal(true);
        }));
        it('should validate permissions', () => __awaiter(this, void 0, void 0, function* () {
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), chipotleCorporateBlog = yield tyranid_1.default.byName['blog'].findOne({ name: 'Mexican Empire' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
            yield expectAsyncToThrow_1.expectAsyncToThrow(() => chipotleCorporateBlog['$isAllowed']('viewBlahBlah', ben), /Invalid permissionType/g, 'checking \'viewBlahBlah\' should throw');
        }));
        it('should create a lock when updating permission and set to false when complete', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const locks = yield tyranidGracl.PermissionLocks.find({}), chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' });
            chai_1.expect(locks).to.have.lengthOf(1);
            chai_1.expect(locks[0]['resourceId']).to.equal(chopped.$uid);
            chai_1.expect(locks[0]['locked']).to.equal(false);
        }));
        it('should successfully find permission when multiple permissions parents', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' });
            const access = yield chopped['$isAllowed']('abstract_view_chart', ben);
            chai_1.expect(access).to.equal(true);
        }));
        it('should throw error when trying to lock same resource twice', () => __awaiter(this, void 0, void 0, function* () {
            const chipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' });
            yield tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle);
            yield expectAsyncToThrow_1.expectAsyncToThrow(() => tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle), /another update is in progress/, 'cannot lock resource that is already locked');
            yield tyranidGracl.PermissionsModel.unlockPermissionsForResource(chipotle);
        }));
        it('should modify existing permissions instead of creating new ones', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' });
            chai_1.expect(chopped[secure.permissionIdProperty]).to.have.lengthOf(1);
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chopped, 'chopped should exist').to.exist;
            const updatedChopped = yield secure.setPermissionAccess(chopped, 'view-user', true, ben);
            chai_1.expect(updatedChopped[permissionKey]).to.have.lengthOf(1);
            const allPermissions = yield tyranidGracl.PermissionsModel.find({});
            chai_1.expect(allPermissions).to.have.lengthOf(1);
        }));
        it('should successfully remove all permissions after secure.deletePermissions()', () => __awaiter(this, void 0, void 0, function* () {
            const ted = yield tyranid_1.default.byName['user'].findOne({ name: 'ted' }), ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' });
            const chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' }), cava = yield tyranid_1.default.byName['organization'].findOne({ name: 'Cava' }), post = yield tyranid_1.default.byName['post'].findOne({ text: 'Why burritos are amazing.' }), chipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' });
            chai_1.expect(!ted[secure.permissionIdProperty]).to.equal(true);
            const permissionsForTed = yield tyranid_1.default.byName['graclPermission'].find({
                $or: [
                    { subjectId: ted.$uid },
                    { resourceId: ted.$uid }
                ]
            });
            chai_1.expect(permissionsForTed).to.have.lengthOf(0);
            const prePermissionChecks = yield Promise.all([
                chopped['$isAllowed']('view-user', ted),
                cava['$isAllowed']('view-post', ted),
                post['$isAllowed']('edit-post', ted),
                ted['$isAllowed']('view-user', ben),
                chipotle['$isAllowed']('view-post', ted)
            ]);
            chai_1.expect(_.all(prePermissionChecks)).to.equal(false);
            const permissionOperations = yield Promise.all([
                chopped['$allow']('view-user', ted),
                cava['$allow']('view-post', ted),
                post['$allow']('edit-post', ted),
                chipotle['$deny']('view-post', ted),
                ted['$allow']('view-user', ben)
            ]);
            const updatedTed = yield tyranid_1.default.byName['user'].findOne({ name: 'ted' });
            chai_1.expect(ted[secure.permissionIdProperty]).to.have.lengthOf(1);
            const updatedPermissionsForTed = yield tyranid_1.default.byName['graclPermission'].find({
                $or: [
                    { subjectId: ted.$uid },
                    { resourceId: ted.$uid }
                ]
            });
            chai_1.expect(updatedPermissionsForTed).to.have.lengthOf(permissionOperations.length);
            const permissionChecks = yield Promise.all([
                chopped['$isAllowed']('view-user', ted),
                cava['$isAllowed']('view-post', ted),
                post['$isAllowed']('edit-post', ted),
                ted['$isAllowed']('view-user', ben)
            ]);
            chai_1.expect(_.all(permissionChecks)).to.equal(true);
            chai_1.expect(yield chipotle['$isAllowed']('view-post', ted)).to.equal(false);
            yield secure.deletePermissions(ted);
            const postPermissionChecks = yield Promise.all([
                chopped['$isAllowed']('view-user', ted),
                cava['$isAllowed']('view-post', ted),
                post['$isAllowed']('edit-post', ted),
                ted['$isAllowed']('view-user', ben)
            ]);
            chai_1.expect(_.all(postPermissionChecks)).to.equal(false);
            const updatedChopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' }), updatedCava = yield tyranid_1.default.byName['organization'].findOne({ name: 'Cava' }), updatedPost = yield tyranid_1.default.byName['post'].findOne({ text: 'Why burritos are amazing.' }), updatedChipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' });
            chai_1.expect(updatedChopped[secure.permissionIdProperty]).to.have.length(0);
            chai_1.expect(updatedCava[secure.permissionIdProperty]).to.have.length(0);
            chai_1.expect(updatedPost[secure.permissionIdProperty]).to.have.length(0);
            chai_1.expect(updatedChipotle[secure.permissionIdProperty]).to.have.length(0);
        }));
        it('should correctly explain permissions', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' });
            const access = yield chopped['$explainPermission']('view-post', ben);
            chai_1.expect(access.reason).to.match(/Permission set on <Resource:organization/);
            chai_1.expect(access.access).to.equal(true);
            chai_1.expect(access.type).to.equal('view-post');
        }));
    });
    describe('plugin.query()', () => {
        it('should return false with no user', () => __awaiter(this, void 0, void 0, function* () {
            const Post = tyranid_1.default.byName['post'], query = yield secure.query(Post, 'view');
            chai_1.expect(query, 'query should be false').to.equal(false);
        }));
        it('should return empty object for collection with no permissions hierarchy node', () => __awaiter(this, void 0, void 0, function* () {
            const Chart = tyranid_1.default.byName['chart'], ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), query = yield secure.query(Chart, 'view', ben);
            chai_1.expect(query, 'query should be {}').to.deep.equal({});
        }));
        it('should produce query restriction based on permissions', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const Post = tyranid_1.default.byName['post'], Blog = tyranid_1.default.byName['blog'], Org = tyranid_1.default.byName['organization'], ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), chopped = yield Org.findOne({ name: 'Chopped' });
            const choppedBlogs = yield Blog.find({ organizationId: chopped.$id }, { _id: 1 });
            const query = yield secure.query(Post, 'view', ben);
            checkStringEq(_.get(query, '$or.0.blogId.$in'), _.map(choppedBlogs, '_id'), 'query should find correct blogs');
        }));
        it('should produce $and clause with excluded and included ids', () => __awaiter(this, void 0, void 0, function* () {
            const ted = yield tyranid_1.default.byName['user'].findOne({ name: 'ted' }), ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' });
            const chopped = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chopped' }), cava = yield tyranid_1.default.byName['organization'].findOne({ name: 'Cava' }), chipotle = yield tyranid_1.default.byName['organization'].findOne({ name: 'Chipotle' }), cavaBlogs = yield tyranid_1.default.byName['blog'].find({ organizationId: cava.$id }), chipotleBlogs = yield tyranid_1.default.byName['blog'].find({ organizationId: chipotle.$id }), post = yield tyranid_1.default.byName['post'].findOne({ text: 'Why burritos are amazing.' });
            const permissionOperations = yield Promise.all([
                cava['$allow']('view-post', ted),
                post['$allow']('view-post', ted),
                chipotle['$deny']('view-post', ted)
            ]);
            const query = yield secure.query(tyranid_1.default.byName['post'], 'view', ted);
            const [positive, negative] = _.get(query, '$and');
            const _idRestriction = _.find(positive['$or'], v => _.contains(_.keys(v), '_id')), blogIdRestriction = _.find(positive['$or'], v => _.contains(_.keys(v), 'blogId')), blogIdNegative = _.find(negative['$and'], v => _.contains(_.keys(v), 'blogId'));
            checkStringEq(_.get(_idRestriction, '_id.$in'), [post.$id]);
            checkStringEq(_.get(blogIdRestriction, 'blogId.$in'), cavaBlogs.map(b => b.$id));
            checkStringEq(_.get(blogIdNegative, 'blogId.$nin'), chipotleBlogs.map(b => b.$id));
        }));
    });
    describe('Collection.find()', () => {
        it('should be appropriately filtered based on permissions', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const Post = tyranid_1.default.byName['post'], User = tyranid_1.default.byName['user'], Blog = tyranid_1.default.byName['blog'], Org = tyranid_1.default.byName['organization'], ben = yield User.findOne({ name: 'ben' });
            const postsBenCanSee = yield Post.find({}, null, { tyranid: { secure: true, user: ben } });
            const chopped = yield Org.findOne({ name: 'Chopped' });
            const choppedBlogs = yield Blog.find({ organizationId: chopped.$id }, { _id: 1 });
            const choppedPosts = yield Post.find({
                blogId: { $in: _.map(choppedBlogs, '_id') }
            });
            checkStringEq(_.map(postsBenCanSee, '_id'), _.map(choppedPosts, '_id'), 'ben should only see chopped posts');
        }));
        it('should default to lowest hierarchy permission', () => __awaiter(this, void 0, void 0, function* () {
            const chopped = yield giveBenAccessToChoppedPosts(), ben = yield tyranid_1.default.byName['user'].findOne({ name: 'ben' }), post = yield tyranid_1.default.byName['post'].findOne({ text: 'Salads are great, the post.' }), choppedBlogs = yield tyranid_1.default.byName['blog'].find({ organizationId: chopped.$id }), choppedPosts = yield tyranid_1.default.byName['post'].find({ blogId: { $in: choppedBlogs.map(b => b.$id) } });
            chai_1.expect(choppedPosts).to.have.lengthOf(2);
            chai_1.expect(_.map(choppedPosts, '$id')).to.contain(post.$id);
            yield post['$deny']('view-post', ben);
            const postsBenCanSee = yield tyranid_1.default.byName['post'].find({}, null, { tyranid: { secure: true, user: ben } });
            chai_1.expect(postsBenCanSee).to.have.lengthOf(1);
            chai_1.expect(_.map(postsBenCanSee, '$id')).to.not.contain(post.$id);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L3NwZWMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBRUEsMEJBQWdCLFNBQVMsQ0FBQyxDQUFBO0FBQzFCLE1BQVksT0FBTyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQ25DLE1BQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLE1BQVksWUFBWSxXQUFNLGlCQUFpQixDQUFDLENBQUE7QUFDaEQsdUJBQXVCLE1BQU0sQ0FBQyxDQUFBO0FBQzlCLG9DQUFrQyw4QkFBOEIsQ0FBQyxDQUFBO0FBQ2pFLGlDQUErQiwyQkFBMkIsQ0FBQyxDQUFBO0FBQzNELHFDQUFtQywrQkFBK0IsQ0FBQyxDQUFBO0FBS25FLE1BQU0sYUFBYSxHQUFHLDBCQUEwQixFQUMxQyxFQUFFLEdBQUcsT0FBTyxDQUFDLDhDQUE4QyxFQUFFLEVBQUUsQ0FBQyxFQUNoRSxJQUFJLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLEVBQzFDLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxXQUFXLENBQUM7SUFDcEMsT0FBTyxFQUFFLEtBQUs7SUFDZCxrQkFBa0IsRUFBRSxhQUFhO0lBQ2pDLGVBQWUsRUFBRTtRQUNmLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFO1FBQ2pDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUU7UUFDakQsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUU7UUFDbkMsRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQ3RELFdBQVc7Z0JBQ1gsV0FBVzthQUNaLEVBQUM7UUFDRixFQUFFLElBQUksRUFBRSx5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