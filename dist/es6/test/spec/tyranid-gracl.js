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
const expectedLinkPaths_1 = require('./expectedLinkPaths');
const createTestData_1 = require('./createTestData');
const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []), root = __dirname.replace(/test\/spec/, ''), secure = new tyranidGracl.GraclPlugin();
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
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chopped = yield Tyr.byName['organization'].findOne({ name: 'Chopped' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chopped, 'chopped should exist').to.exist;
            const updatedChopped = yield tyranidGracl
                .PermissionsModel
                .setPermissionAccess(chopped, 'view-post', true, ben);
            const existingPermissions = yield tyranidGracl.PermissionsModel.find({}, null, { tyranid: { insecure: true } });
            chai_1.expect(existingPermissions).to.have.lengthOf(1);
            chai_1.expect(existingPermissions[0]['resourceId'].toString(), 'resourceId')
                .to.equal(updatedChopped['permissions'][0]['resourceId'].toString());
            chai_1.expect(existingPermissions[0]['subjectId'].toString(), 'subjectId')
                .to.equal(updatedChopped['permissions'][0]['subjectId'].toString());
            chai_1.expect(existingPermissions[0]['access']['view-post'], 'access')
                .to.equal(updatedChopped['permissions'][0]['access']['view-post']);
        }));
        it('should respect permissions hierarchy', () => __awaiter(this, void 0, void 0, function* () {
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), choppedBlog = yield Tyr.byName['blog'].findOne({ name: 'Salads are great' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(choppedBlog, 'choppedBlog should exist').to.exist;
            chai_1.expect(yield choppedBlog['$isAllowed']('view-post', ben), 'ben should have access to choppedBlog through access to chopped org').to.equal(true);
        }));
        it('should validate permissions', () => __awaiter(this, void 0, void 0, function* () {
            const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chipotleCorporateBlog = yield Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });
            chai_1.expect(ben, 'ben should exist').to.exist;
            chai_1.expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
            let threw = false, message = '';
            try {
                yield chipotleCorporateBlog['$isAllowed']('view', ben);
            }
            catch (err) {
                threw = true;
                message = err.message;
            }
            chai_1.expect(threw, 'checking \"view\" without collection should throw').to.equal(true);
            chai_1.expect(message, `Error message should contain \"No collection name in permission type\"`)
                .to.match(/No collection name in permission type/g);
        }));
        it('should modify existing permissions instead of creating new ones', () => __awaiter(this, void 0, void 0, function* () {
            console.warn('ADD TEST');
        }));
        it('should successfully remove all permissions after PermissionsModel.deletePermissions()', () => __awaiter(this, void 0, void 0, function* () {
            console.warn('ADD TEST');
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
            const Post = Tyr.byName['post'], Blog = Tyr.byName['blog'], Org = Tyr.byName['organization'], ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chopped = yield Org.findOne({ name: 'Chopped' });
            const choppedBlogs = yield Blog.find({ organizationId: chopped['_id'] }, { _id: 1 }, { tyranid: { insecure: true } });
            const query = yield secure.query(Post, 'view', ben);
            chai_1.expect(query, 'query should find correct blogs').to.deep.equal({
                blogId: { $in: _.map(choppedBlogs, '_id') }
            });
        }));
        it('should produce query with primaryKey field set if permissions are directly set for collection', () => __awaiter(this, void 0, void 0, function* () {
            console.warn('ADD TEST');
        }));
        it('should produce $and clause with excluded and included ids', () => {
            console.warn('ADD TEST');
        });
    });
    describe('Collection.find()', () => {
        it('should be appropriately filtered based on permissions', () => __awaiter(this, void 0, void 0, function* () {
            const Post = Tyr.byName['post'], User = Tyr.byName['user'], Blog = Tyr.byName['blog'], Org = Tyr.byName['organization'], ben = yield User.findOne({ name: 'ben' });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlyYW5pZC1ncmFjbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3Qvc3BlYy90eXJhbmlkLWdyYWNsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUVBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQy9CLE1BQVksT0FBTyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQ25DLE1BQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLE1BQVksWUFBWSxXQUFNLGlCQUFpQixDQUFDLENBQUE7QUFDaEQsdUJBQXVCLE1BQU0sQ0FBQyxDQUFBO0FBQzlCLG9DQUFrQyxxQkFBcUIsQ0FBQyxDQUFBO0FBQ3hELGlDQUErQixrQkFBa0IsQ0FBQyxDQUFBO0FBR2xELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyw4Q0FBOEMsRUFBRSxFQUFFLENBQUMsRUFDaEUsSUFBSSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxFQUMxQyxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7QUFHOUMsUUFBUSxDQUFDLGVBQWUsRUFBRTtJQUd4QixNQUFNLENBQUM7UUFFTCxHQUFHLENBQUMsTUFBTSxDQUFDO1lBQ1QsRUFBRSxFQUFFLEVBQUU7WUFDTixRQUFRLEVBQUU7Z0JBQ1IsRUFBRSxHQUFHLEVBQUUsSUFBSSxHQUFHLGNBQWMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFO2dCQUNyRCxFQUFFLEdBQUcsRUFBRSxJQUFJLEdBQUcsYUFBYSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUU7YUFDckQ7WUFDRCxNQUFNLEVBQUUsTUFBTTtZQUNkLEdBQUcsRUFBRSxLQUFLO1NBQ1gsQ0FBQyxDQUFDO1FBRUgsTUFBTSwrQkFBYyxFQUFFLENBQUM7SUFDekIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUdILFVBQVUsQ0FBQztRQUNULEdBQUcsQ0FBQyxLQUFL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