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