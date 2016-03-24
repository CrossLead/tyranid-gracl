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
            chai_1.expect(_idRestriction['_id'], 'should correctly map own _id field').to.deep.equal({ $in: chartIds });
            chai_1.expect(blogIdRestriction['blogId'], 'should find correct property').to.deep.equal({ $in: blogIds });
            chai_1.expect(userIdsRestriction['userIds'], 'should find correct property').to.deep.equal({ $in: userIds });
            const createQueryNoLink = () => {
                tyranidGracl.createInQueries(queryAgainstChartMap, Tyr.byName['organization'], '$in');
            };
            chai_1.expect(createQueryNoLink, 'creating query for collection with no outgoing link to mapped collection')
                .to.throw(/No outgoing link/);
        }));
        it('should return correct ids after calling stepThroughCollectionPath', () => __awaiter(this, void 0, void 0, function* () {
            const chipotle = yield Tyr.byName['organization'].findOne({ name: 'Chipotle' }), chipotleBlogs = yield Tyr.byName['blog'].find({ organizationId: chipotle.$id }, null, insecure), blogIds = _.map(chipotleBlogs, '_id'), chipotlePosts = yield Tyr.byName['post'].find({ blogId: { $in: blogIds } }), postIds = _.map(chipotlePosts, '_id');
            const steppedPostIds = yield tyranidGracl.stepThroughCollectionPath(blogIds, Tyr.byName['blog'], Tyr.byName['post']);
            chai_1.expect(steppedPostIds, 'ids after stepping should be all relevant ids').to.deep.equal(postIds);
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
            chai_1.expect(_.get(query, '$or.0'), 'query should find correct blogs').to.deep.equal({
                blogId: { $in: _.map(choppedBlogs, '_id') }
            });
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
            const _idRestriction = _.find(positive['$or'], v => _.contains(_.keys(v), '_id')), blogIdRestriction = _.find(positive['$or'], v => _.contains(_.keys(v), 'blogId'));
            chai_1.expect(_idRestriction).to.deep.equal({
                '_id': {
                    '$in': [
                        post.$id
                    ]
                }
            });
            chai_1.expect(blogIdRestriction).to.deep.equal({
                'blogId': {
                    '$in': cavaBlogs.map(b => b.$id)
                }
            });
            const blogIdNegative = _.find(negative['$and'], v => _.contains(_.keys(v), 'blogId'));
            chai_1.expect(blogIdNegative).to.deep.equal({
                blogId: {
                    $nin: chipotleBlogs.map(b => b.$id)
                }
            });
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
            chai_1.expect(postsBenCanSee, 'ben should only see chopped posts').to.deep.equal(choppedPosts);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L3NwZWMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBRUEsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDL0IsTUFBWSxPQUFPLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDbkMsTUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsTUFBWSxZQUFZLFdBQU0saUJBQWlCLENBQUMsQ0FBQTtBQUNoRCx1QkFBdUIsTUFBTSxDQUFDLENBQUE7QUFDOUIsb0NBQWtDLDhCQUE4QixDQUFDLENBQUE7QUFDakUsaUNBQStCLDJCQUEyQixDQUFDLENBQUE7QUFDM0QscUNBQW1DLCtCQUErQixDQUFDLENBQUE7QUFHbkUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLDhDQUE4QyxFQUFFLEVBQUUsQ0FBQyxFQUNoRSxJQUFJLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLEVBQzFDLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxXQUFXLEVBQUUsRUFDdkMsUUFBUSxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7QUFHakQ7O1FBQ0UsTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUN2RCxPQUFPLEdBQUcsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBRTlFLGFBQU0sQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ3pDLGFBQU0sQ0FBQyxPQUFPLEVBQUUs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