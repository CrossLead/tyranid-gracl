"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
const expectAsyncToThrow_1 = require('../helpers/expectAsyncToThrow');
const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []), root = __dirname.replace(/test\/spec/, ''), secure = new tyranidGracl.GraclPlugin(), insecure = { tyranid: { insecure: true } };
const checkStringEq = (got, want, message = '') => {
    chai_1.expect(_.map(got, s => s.toString()), message)
        .to.deep.equal(_.map(want, s => s.toString()));
};
function giveBenAccessToChoppedPosts() {
    return __awaiter(this, void 0, void 0, function* () {
        const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chopped = yield Tyr.byName['organization'].findOne({ name: 'Chopped' });
        chai_1.expect(ben, 'ben should exist').to.exist;
        chai_1.expect(chopped, 'chopped should exist').to.exist;
        const updatedChopped = yield tyranidGracl
            .PermissionsModel
            .setPermissionAccess(chopped, 'view-post', true, ben);
        return updatedChopped;
    });
}
describe('tyranid-gracl', () => {
    before(() => __awaiter(this, void 0, void 0, function* () {
        Tyr.config({
            db: db,
            validate: [
                { dir: root + '/test/models', fileMatch: '[a-z].js' },
                { dir: root + '/lib/models', fileMatch: '[a-z].js' }
            ],
            secure: secure,
            cls: false
        });
        yield createTestData_1.createTestData();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield createTestData_1.createTestData();
        Tyr.local.user = undefined;
    }));
    describe('utility functions', () => {
        it('should correctly find links using getCollectionLinksSorted', () => {
            const Chart = Tyr.byName['chart'], options = { direction: 'outgoing' }, links = tyranidGracl.getCollectionLinksSorted(Chart, options);
            chai_1.expect(links, 'should produce sorted links')
                .to.deep.equal(_.sortBy(Chart.links(options), field => field.link.def.name));
        });
        it('should find specific link using findLinkInCollection', () => {
            const Chart = Tyr.byName['chart'], User = Tyr.byName['user'], linkField = tyranidGracl.findLinkInCollection(Chart, User);
            chai_1.expect(linkField).to.exist;
            chai_1.expect(linkField.link.def.name).to.equal('user');
            chai_1.expect(linkField.spath).to.equal('userIds');
        });
        it('should correctly create formatted queries using createInQueries', () => __awaiter(this, void 0, void 0, function* () {
            const getIdsForCol = (col) => __awaiter(this, void 0, void 0, function* () {
                return _.map(yield Tyr.byName[col].find({}, null, insecure), '_id');
            });
            const blogIds = yield getIdsForCol('blog'), userIds = yield getIdsForCol('user'), chartIds = yield getIdsForCol('chart');
            const queryAgainstChartMap = new Map([
                ['blog', new Set(blogIds)],
                ['user', new Set(userIds)],
                ['chart', new Set(chartIds)]
            ]);
            const query = tyranidGracl.createInQueries(queryAgainstChartMap, Tyr.byName['chart'], '$in');
            const _idRestriction = _.find(query['$or'], v => _.contains(_.keys(v), '_id')), blogIdRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'blogId')), userIdsRestriction = _.find(query['$or'], v => _.contains(_.keys(v), 'userIds'));
            checkStringEq(_idRestriction['_id']['$in'], chartIds, 'should correctly map own _id field');
            checkStringEq(blogIdRestriction['blogId']['$in'], blogIds, 'should find correct property');
            checkStringEq(userIdsRestriction['userIds']['$in'], userIds, 'should find correct property');
            const createQueryNoLink = () => {
                tyranidGracl.createInQueries(queryAgainstChartMap, Tyr.byName['organization'], '$in');
            };
            chai_1.expect(createQueryNoLink, 'creating query for collection with no outgoing link to mapped collection')
                .to.throw(/No outgoing link/);
        }));
        it('should return correct ids after calling stepThroughCollectionPath', () => __awaiter(this, void 0, void 0, function* () {
            const chipotle = yield Tyr.byName['organization'].findOne({ name: 'Chipotle' }), chipotleBlogs = yield Tyr.byName['blog'].find({ organizationId: chipotle.$id }, null, insecure), blogIds = _.map(chipotleBlogs, '_id'), chipotlePosts = yield Tyr.byName['post'].find({ blogId: { $in: blogIds } }), postIds = _.map(chipotlePosts, '_id');
            const steppedPostIds = yield tyranidGracl.stepThroughCollectionPath(blogIds, Tyr.byName['blog'], Tyr.byName['post']);
            checkStringEq(steppedPostIds, postIds, 'ids after stepping should be all relevant ids');
            yield expectAsyncToThrow_1.expectAsyncToThrow(() => tyranidGracl.stepThroughCollectionPath(blogIds, Tyr.byName['blog'], Tyr.byName['user']), /cannot step through collection path, as no link to collection/, 'stepping to a collection with no connection to previous col should throw');
        }));
    });
    describe('Creating the plugin', () => {
        it('should correctly produce paths between collections', () => {
            for (const a in expectedLinkPaths_1.expectedLinkPaths) {
                for (const b in expectedLinkPaths_1.expectedLinkPaths[a]) {
                    chai_1.expect(secure.getShortestPath(Tyr.byName[a], Tyr.byName[b]), `Path from ${a} to ${b}`)
                        .to.deep.equal(expectedLinkPaths_1.expectedLinkPaths[a][b] || []);
                }
            }
        });
        it('should add permissions methods to documents', () => __awaiter(this, void 0, void 0, function* () {
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' });
            chai_1.expect(ben, 'should have method: $isAllowed').to.have.property('$isAllowed');
            chai_1.expect(ben, 'should have method: $setPermissionAccess').to.have.property('$setPermissionAccess');
            chai_1.expect(ben, 'should have method: $allow').to.have.property('$allow');
            chai_1.expect(ben, 'should have method: $deny').to.have.property('$deny');
        }));
    });
    describe('Working with permissions', () => {
        it('should successfully add permissions', () => __awaiter(this, void 0, void 0, function* () {
            const updatedChopped = yield giveBenAccessToChoppedPosts();
            const existingPermissions = yield tyranidGracl.PermissionsModel.find({}, null, insecure);
            chai_1.expect(existingPermissions).to.have.lengthOf(1);
            chai_1.expect(existingPermissions[0]['resourceId'].toString(), 'resourceId')
                .to.equal(updatedChopped['permissions'][0]['resourceId'].toString());
            chai_1.expect(existingPermissions[0]['subjectId'].toString(), 'subjectId')
                .to.equal(updatedChopped['permissions'][0]['subjectId'].toString());
            chai_1.expect(existingPermissions[0]['access']['view-post'], 'access')
                .to.equal(updatedChopped['permissions'][0]['access']['view-post']);
        }));
        it('should respect permissions hierarchy', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), choppedBlog = yield Tyr.byName['blog'].findOne({ name: 'Salads are great' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(choppedBlog, 'choppedBlog should exist').to.exist;
            chai_1.expect(yield choppedBlog['$isAllowed']('view-post', ben), 'ben should have access to choppedBlog through access to chopped org').to.equal(true);
        }));
        it('should validate permissions', () => __awaiter(this, void 0, void 0, function* () {
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chipotleCorporateBlog = yield Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
            yield expectAsyncToThrow_1.expectAsyncToThrow(() => chipotleCorporateBlog['$isAllowed']('view', ben), /No collection name in permission type/g, 'checking \'view\' without collection should throw');
        }));
        it('should create a lock when updating permission and set to false when complete', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const locks = yield tyranidGracl.PermissionLocks.find({}, null, insecure), chopped = yield Tyr.byName['organization'].findOne({ name: 'Chopped' });
            chai_1.expect(locks).to.have.lengthOf(1);
            chai_1.expect(locks[0]['resourceId']).to.equal(chopped.$uid);
            chai_1.expect(locks[0]['locked']).to.equal(false);
        }));
        it('should throw error when trying to lock same resource twice', () => __awaiter(this, void 0, void 0, function* () {
            const chipotle = yield Tyr.byName['organization'].findOne({ name: 'Chipotle' });
            yield tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle);
            yield expectAsyncToThrow_1.expectAsyncToThrow(() => tyranidGracl.PermissionsModel.lockPermissionsForResource(chipotle), /another update is in progress/, 'cannot lock resource that is already locked');
            yield tyranidGracl.PermissionsModel.unlockPermissionsForResource(chipotle);
        }));
        it('should modify existing permissions instead of creating new ones', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chopped = yield Tyr.byName['organization'].findOne({ name: 'Chopped' });
            chai_1.expect(chopped['permissionIds']).to.have.lengthOf(1);
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chopped, 'chopped should exist').to.exist;
            const updatedChopped = yield tyranidGracl
                .PermissionsModel
                .setPermissionAccess(chopped, 'view-user', true, ben);
            chai_1.expect(updatedChopped['permissions']).to.have.lengthOf(1);
            const allPermissions = yield tyranidGracl.PermissionsModel.find({});
            chai_1.expect(allPermissions).to.have.lengthOf(1);
        }));
        it('should successfully remove all permissions after PermissionsModel.deletePermissions()', () => __awaiter(this, void 0, void 0, function* () {
            const ted = yield Tyr.byName['user'].findOne({ name: 'ted' }), ben = yield Tyr.byName['user'].findOne({ name: 'ben' });
            const chopped = yield Tyr.byName['organization'].findOne({ name: 'Chopped' }), cava = yield Tyr.byName['organization'].findOne({ name: 'Cava' }), post = yield Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' }), chipotle = yield Tyr.byName['organization'].findOne({ name: 'Chipotle' });
            chai_1.expect(!ted['permissionIds']).to.equal(true);
            const permissionsForTed = yield Tyr.byName['graclPermission'].find({
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
            const updatedTed = yield Tyr.byName['user'].findOne({ name: 'ted' });
            chai_1.expect(ted['permissionIds']).to.have.lengthOf(1);
            const updatedPermissionsForTed = yield Tyr.byName['graclPermission'].find({
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
            yield tyranidGracl.PermissionsModel.deletePermissions(ted);
            const postPermissionChecks = yield Promise.all([
                chopped['$isAllowed']('view-user', ted),
                cava['$isAllowed']('view-post', ted),
                post['$isAllowed']('edit-post', ted),
                ted['$isAllowed']('view-user', ben)
            ]);
            chai_1.expect(_.all(postPermissionChecks)).to.equal(false);
            const updatedChopped = yield Tyr.byName['organization'].findOne({ name: 'Chopped' }), updatedCava = yield Tyr.byName['organization'].findOne({ name: 'Cava' }), updatedPost = yield Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' }), updatedChipotle = yield Tyr.byName['organization'].findOne({ name: 'Chipotle' });
            chai_1.expect(updatedChopped['permissionIds']).to.have.length(0);
            chai_1.expect(updatedCava['permissionIds']).to.have.length(0);
            chai_1.expect(updatedPost['permissionIds']).to.have.length(0);
            chai_1.expect(updatedChipotle['permissionIds']).to.have.length(0);
        }));
    });
    describe('plugin.query()', () => {
        it('should return false with no user', () => __awaiter(this, void 0, void 0, function* () {
            const Post = Tyr.byName['post'], query = yield secure.query(Post, 'view');
            chai_1.expect(query, 'query should be false').to.equal(false);
        }));
        it('should return empty object for collection with no permissions hierarchy node', () => __awaiter(this, void 0, void 0, function* () {
            const Chart = Tyr.byName['chart'], ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), query = yield secure.query(Chart, 'view', ben);
            chai_1.expect(query, 'query should be {}').to.deep.equal({});
        }));
        it('should produce query restriction based on permissions', () => __awaiter(this, void 0, void 0, function* () {
            yield giveBenAccessToChoppedPosts();
            const Post = Tyr.byName['post'], Blog = Tyr.byName['blog'], Org = Tyr.byName['organization'], ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chopped = yield Org.findOne({ name: 'Chopped' });
            const choppedBlogs = yield Blog.find({ organizationId: chopped.$id }, { _id: 1 }, insecure);
            const query = yield secure.query(Post, 'view', ben);
            checkStringEq(_.get(query, '$or.0.blogId.$in'), _.map(choppedBlogs, '_id'), 'query should find correct blogs');
        }));
        it('should produce $and clause with excluded and included ids', () => __awaiter(this, void 0, void 0, function* () {
            const ted = yield Tyr.byName['user'].findOne({ name: 'ted' }), ben = yield Tyr.byName['user'].findOne({ name: 'ben' });
            const chopped = yield Tyr.byName['organization'].findOne({ name: 'Chopped' }), cava = yield Tyr.byName['organization'].findOne({ name: 'Cava' }), chipotle = yield Tyr.byName['organization'].findOne({ name: 'Chipotle' }), cavaBlogs = yield Tyr.byName['blog'].find({ organizationId: cava.$id }, null, insecure), chipotleBlogs = yield Tyr.byName['blog'].find({ organizationId: chipotle.$id }, null, insecure), post = yield Tyr.byName['post'].findOne({ text: 'Why burritos are amazing.' });
            const permissionOperations = yield Promise.all([
                cava['$allow']('view-post', ted),
                post['$allow']('view-post', ted),
                chipotle['$deny']('view-post', ted)
            ]);
            const query = yield secure.query(Tyr.byName['post'], 'view', ted);
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
            const Post = Tyr.byName['post'], User = Tyr.byName['user'], Blog = Tyr.byName['blog'], Org = Tyr.byName['organization'], ben = yield User.findOne({ name: 'ben' });
            Tyr.local.user = ben;
            const postsBenCanSee = yield Post.find({});
            const chopped = yield Org.findOne({ name: 'Chopped' });
            const choppedBlogs = yield Blog.find({ organizationId: chopped.$id }, { _id: 1 }, insecure);
            const choppedPosts = yield Post.find({
                blogId: { $in: _.map(choppedBlogs, '_id') }
            }, null, insecure);
            checkStringEq(_.map(postsBenCanSee, '_id'), _.map(choppedPosts, '_id'), 'ben should only see chopped posts');
        }));
        it('should default to lowest hierarchy permission', () => __awaiter(this, void 0, void 0, function* () {
            const chopped = yield giveBenAccessToChoppedPosts(), ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), post = yield Tyr.byName['post'].findOne({ text: 'Salads are great, the post.' }), choppedBlogs = yield Tyr.byName['blog'].find({ organizationId: chopped.$id }, null, insecure), choppedPosts = yield Tyr.byName['post'].find({ blogId: { $in: choppedBlogs.map(b => b.$id) } }, null, insecure);
            chai_1.expect(choppedPosts).to.have.lengthOf(2);
            chai_1.expect(_.map(choppedPosts, '$id')).to.contain(post.$id);
            yield post['$deny']('view-post', ben);
            const query = yield secure.query(Tyr.byName['post'], 'view', ben);
            Tyr.local.user = ben;
            const postsBenCanSee = yield Tyr.byName['post'].find({});
            chai_1.expect(postsBenCanSee).to.have.lengthOf(1);
            chai_1.expect(_.map(postsBenCanSee, '$id')).to.not.contain(post.$id);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L3NwZWMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBRUEsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDL0IsTUFBWSxPQUFPLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDbkMsTUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsTUFBWSxZQUFZLFdBQU0saUJBQWlCLENBQUMsQ0FBQTtBQUNoRCx1QkFBdUIsTUFBTSxDQUFDLENBQUE7QUFDOUIsb0NBQWtDLDhCQUE4QixDQUFDLENBQUE7QUFDakUsaUNBQStCLDJCQUEyQixDQUFDLENBQUE7QUFDM0QscUNBQW1DLCtCQUErQixDQUFDLENBQUE7QUFHbkUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLDhDQUE4QyxFQUFFLEVBQUUsQ0FBQyxFQUNoRSxJQUFJLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLEVBQzFDLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxXQUFXLEVBQUUsRUFDdkMsUUFBUSxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7QUFHakQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFhLEVBQUUsSUFBYyxFQUFFLE9BQU8sR0FBRyxFQUFFO0lBQ2hFLGFBQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDO1NBQzNDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQztBQUdGOztRQUNFLE1B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