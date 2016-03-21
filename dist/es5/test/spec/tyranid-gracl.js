"use strict";

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = _promise2.default))(function (resolve, reject) {
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
var Tyr = require('tyranid');
var tpmongo = require('tpmongo');
var tyranidGracl = require('../../lib/index');
var chai_1 = require('chai');
var expectedLinkPaths_1 = require('./expectedLinkPaths');
var createTestData_1 = require('./createTestData');
var db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
    root = __dirname.replace(/test\/spec/, ''),
    secure = new tyranidGracl.GraclPlugin();
describe('tyranid-gracl', function () {
    before(function () {
        return __awaiter(this, void 0, void 0, _regenerator2.default.mark(function _callee() {
            return _regenerator2.default.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            secure.verbose = true;
                            Tyr.config({
                                db: db,
                                validate: [{ dir: root + '/test/models', fileMatch: '[a-z].js' }, { dir: root + '/lib/models', fileMatch: '[a-z].js' }],
                                secure: secure
                            });
                            _context.next = 4;
                            return createTestData_1.createTestData();

                        case 4:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this);
        }));
    });
    it('Cached link paths should be correctly constructed', function () {
        for (var a in expectedLinkPaths_1.expectedLinkPaths) {
            for (var b in expectedLinkPaths_1.expectedLinkPaths[a]) {
                chai_1.expect(secure.getShortestPath(Tyr.byName[a], Tyr.byName[b]), 'Path from ' + a + ' to ' + b).to.deep.equal(expectedLinkPaths_1.expectedLinkPaths[a][b] || []);
            }
        }
    });
    it('Adding permissions should work', function () {
        return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee2() {
            var ben, chipotle, updatedChipotle, existingPermissions;
            return _regenerator2.default.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            _context2.next = 2;
                            return Tyr.byName['user'].findOne({ name: 'ben' });

                        case 2:
                            ben = _context2.sent;
                            _context2.next = 5;
                            return Tyr.byName['organization'].findOne({ name: 'Chipotle' });

                        case 5:
                            chipotle = _context2.sent;

                            chai_1.expect(ben, 'ben should exist').to.exist;
                            chai_1.expect(chipotle, 'chipotle should exist').to.exist;
                            _context2.next = 10;
                            return tyranidGracl.PermissionsModel.setPermissionAccess(chipotle, 'view-post', true, ben);

                        case 10:
                            updatedChipotle = _context2.sent;
                            _context2.next = 13;
                            return tyranidGracl.PermissionsModel.find({}, null, { tyranid: { insecure: true } });

                        case 13:
                            existingPermissions = _context2.sent;

                            chai_1.expect(existingPermissions).to.have.lengthOf(1);
                            chai_1.expect(existingPermissions[0]['resourceId'].toString(), 'resourceId').to.equal(updatedChipotle['permissions'][0]['resourceId'].toString());
                            chai_1.expect(existingPermissions[0]['subjectId'].toString(), 'subjectId').to.equal(updatedChipotle['permissions'][0]['subjectId'].toString());
                            chai_1.expect(existingPermissions[0]['access']['view-post'], 'access').to.equal(updatedChipotle['permissions'][0]['access']['view-post']);

                        case 18:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));
    });
    it('Permissions hierarchy should be respected', function () {
        return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee3() {
            var ben, chipotleFoodBlog;
            return _regenerator2.default.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            _context3.next = 2;
                            return Tyr.byName['user'].findOne({ name: 'ben' });

                        case 2:
                            ben = _context3.sent;
                            _context3.next = 5;
                            return Tyr.byName['blog'].findOne({ name: 'Burritos Etc' });

                        case 5:
                            chipotleFoodBlog = _context3.sent;

                            chai_1.expect(ben, 'ben should exist').to.exist;
                            chai_1.expect(chipotleFoodBlog, 'chipotleFoodBlog should exist').to.exist;
                            _context3.t0 = chai_1;
                            _context3.next = 11;
                            return chipotleFoodBlog['$isAllowed']('view-post', ben);

                        case 11:
                            _context3.t1 = _context3.sent;

                            _context3.t0.expect.call(_context3.t0, _context3.t1, 'ben should have access to chipotleFoodBlog through access to chipotle org').to.equal(true);

                        case 13:
                        case 'end':
                            return _context3.stop();
                    }
                }
            }, _callee3, this);
        }));
    });
    it('Collection.find() should be appropriately filtered based on permissions', function () {
        return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee4() {
            var ben;
            return _regenerator2.default.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            _context4.next = 2;
                            return Tyr.byName['user'].findOne({ name: 'ben' });

                        case 2:
                            ben = _context4.sent;

                        case 3:
                        case 'end':
                            return _context4.stop();
                    }
                }
            }, _callee4, this);
        }));
    });
    it('Permissions should be validated', function () {
        return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee5() {
            var ben, chipotleCorporateBlog, threw, message;
            return _regenerator2.default.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            _context5.next = 2;
                            return Tyr.byName['user'].findOne({ name: 'ben' });

                        case 2:
                            ben = _context5.sent;
                            _context5.next = 5;
                            return Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });

                        case 5:
                            chipotleCorporateBlog = _context5.sent;

                            chai_1.expect(ben, 'ben should exist').to.exist;
                            chai_1.expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
                            threw = false, message = '';
                            _context5.prev = 9;
                            _context5.next = 12;
                            return chipotleCorporateBlog['$isAllowed']('view', ben);

                        case 12:
                            _context5.next = 18;
                            break;

                        case 14:
                            _context5.prev = 14;
                            _context5.t0 = _context5['catch'](9);

                            threw = true;
                            message = _context5.t0.message;

                        case 18:
                            chai_1.expect(threw, 'checking \"view\" without collection should throw').to.equal(true);
                            chai_1.expect(message, 'Error message should contain "No collection name in permission type"').to.match(/No collection name in permission type/g);

                        case 20:
                        case 'end':
                            return _context5.stop();
                    }
                }
            }, _callee5, this, [[9, 14]]);
        }));
    });
});