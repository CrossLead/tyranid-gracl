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
const tyranidGracl = require('../../lib/index');
const chai_1 = require('chai');
const expectedLinkPaths_1 = require('./expectedLinkPaths');
const createTestData_1 = require('./createTestData');
const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []), root = __dirname.replace(/test\/spec/, ''), secure = new tyranidGracl.GraclPlugin();
describe('tyranid-gracl', () => {
    before(function () {
        return __awaiter(this, void 0, void 0, function* () {
            secure.verbose = true;
            Tyr.config({
                db: db,
                validate: [
                    { dir: root + '/test/models', fileMatch: '[a-z].js' },
                    { dir: root + '/lib/models', fileMatch: '[a-z].js' }
                ],
                secure: secure
            });
            yield createTestData_1.createTestData();
        });
    });
    it('Cached link paths should be correctly constructed', () => {
        for (const a in expectedLinkPaths_1.expectedLinkPaths) {
            for (const b in expectedLinkPaths_1.expectedLinkPaths[a]) {
                chai_1.expect(secure.getShortestPath(Tyr.byName[a], Tyr.byName[b]), `Path from ${a} to ${b}`)
                    .to.deep.equal(expectedLinkPaths_1.expectedLinkPaths[a][b] || []);
            }
        }
    });
    it('Adding permissions should work', () => __awaiter(this, void 0, void 0, function* () {
        const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chipotle = yield Tyr.byName['organization'].findOne({ name: 'Chipotle' });
        chai_1.expect(ben, 'ben should exist').to.exist;
        chai_1.expect(chipotle, 'chipotle should exist').to.exist;
        const updatedChipotle = yield tyranidGracl
            .PermissionsModel
            .setPermissionAccess(chipotle, 'view-post', true, ben);
        const existingPermissions = yield tyranidGracl.PermissionsModel.find({});
        chai_1.expect(existingPermissions).to.have.lengthOf(1);
        chai_1.expect(existingPermissions[0]['resourceId'].toString(), 'resourceId')
            .to.equal(updatedChipotle['permissions'][0]['resourceId'].toString());
        chai_1.expect(existingPermissions[0]['subjectId'].toString(), 'subjectId')
            .to.equal(updatedChipotle['permissions'][0]['subjectId'].toString());
        chai_1.expect(existingPermissions[0]['access']['view-post'], 'access')
            .to.equal(updatedChipotle['permissions'][0]['access']['view-post']);
    }));
    it('Permissions hierarchy should be respected', () => __awaiter(this, void 0, void 0, function* () {
        const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chipotleFoodBlog = yield Tyr.byName['blog'].findOne({ name: 'Burritos Etc' });
        chai_1.expect(ben, 'ben should exist').to.exist;
        chai_1.expect(chipotleFoodBlog, 'chipotleFoodBlog should exist').to.exist;
        chai_1.expect(yield chipotleFoodBlog['$isAllowed']('view-post', ben), 'ben should have access to chipotleFoodBlog through access to chipotle org').to.equal(true);
    }));
    it('Permissions should be validated', () => __awaiter(this, void 0, void 0, function* () {
        const ben = yield Tyr.byName['user'].findOne({ name: 'ben' }), chipotleCorporateBlog = yield Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });
        chai_1.expect(ben, 'ben should exist').to.exist;
        chai_1.expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
        let threw = false;
        try {
            yield chipotleCorporateBlog['$isAllowed']('view', ben);
        }
        catch (err) {
            threw = true;
        }
        chai_1.expect(threw, 'checking \"view\" without collection should throw').to.equal(true);
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlyYW5pZC1ncmFjbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3Qvc3BlYy90eXJhbmlkLWdyYWNsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUVBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQy9CLE1BQVksT0FBTyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBRW5DLE1BQVksWUFBWSxXQUFNLGlCQUFpQixDQUFDLENBQUE7QUFDaEQsdUJBQXVCLE1BQU0sQ0FBQyxDQUFBO0FBQzlCLG9DQUFrQyxxQkFBcUIsQ0FBQyxDQUFBO0FBQ3hELGlDQUErQixrQkFBa0IsQ0FBQyxDQUFBO0FBR2xELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyw4Q0FBOEMsRUFBRSxFQUFFLENBQUMsRUFDaEUsSUFBSSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxFQUMxQyxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7QUFHOUMsUUFBUSxDQUFDLGVBQWUsRUFBRTtJQUV4QixNQUFNLENBQUM7O1lBQ0wsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFFdEIsR0FBRyxDQUFDLE1BQU0sQ0FBQztnQkFDVCxFQUFFLEVBQUUsRUFBRTtnQkFDTixRQUFRLEVBQUU7b0JBQ1IsRUFBRSxHQUFHLEVBQUUsSUFBSSxHQUFHLGNBQWMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFO29CQUNyRCxFQUFFLEdBQUcsRUFBRSxJQUFJLEdBQUcsYUFBYSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUU7aUJBQ3JEO2dCQUNELE1BQU0sRUFBRSxNQUFNO2FBQ2YsQ0FBQyxDQUFDO1lBRUgsTUFBTSwrQkFBYyxFQUFFLENBQUM7UUFDekIsQ0FBQztLQUFBLENBQUMsQ0FBQztJQUdILEVBQUUsQ0FBQyxtREFBbUQsRUFBRTtRQUN0RCxHQUFHLENBQUMsQ0FBQyxN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