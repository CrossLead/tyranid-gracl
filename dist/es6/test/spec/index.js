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
        it('should lock permissions for resource while update in progress', () => __awaiter(this, void 0, void 0, function* () {
            console.warn('ADD TEST');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L3NwZWMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBRUEsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDL0IsTUFBWSxPQUFPLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDbkMsTUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsTUFBWSxZQUFZLFdBQU0saUJBQWlCLENBQUMsQ0FBQTtBQUNoRCx1QkFBdUIsTUFBTSxDQUFDLENBQUE7QUFDOUIsb0NBQWtDLDhCQUE4QixDQUFDLENBQUE7QUFDakUsaUNBQStCLDJCQUEyQixDQUFDLENBQUE7QUFHM0QsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLDhDQUE4QyxFQUFFLEVBQUUsQ0FBQyxFQUNoRSxJQUFJLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLEVBQzFDLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUc5QyxRQUFRLENBQUMsZUFBZSxFQUFFO0lBR3hCLE1BQU0sQ0FBQztRQUVMLEdBQUcsQ0FBQyxNQUFNLENBQUM7WUFDVCxFQUFFLEVBQUUsRUFBRTtZQUNOLFFBQVEsRUFBRTtnQkFDUixFQUFFLEdBQUcsRUFBRSxJQUFJLEdBQUcsY0FBYyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUU7Z0JBQ3JELEVBQUUsR0FBRyxFQUFFLElBQUksR0FBRyxhQUFhLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRTthQUNyRDtZQUNELE1BQU0sRUFBRSxNQUFNO1lBQ2QsR0FBRyxFQUFFLEtBQUs7U0FDWCxDQUFDLENBQUM7UUFFSCxNQUFNLCtCQUFjLEVBQUUsQ0FBQztJQUN6QixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBR0gsVUFBVSxDQUFDO1FBQ1QsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcs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