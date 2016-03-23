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
var _ = require('lodash');
var tyranidGracl = require('../../lib/index');
var chai_1 = require('chai');
var expectedLinkPaths_1 = require('./expectedLinkPaths');
var createTestData_1 = require('./createTestData');
var db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
    root = __dirname.replace(/test\/spec/, ''),
    secure = new tyranidGracl.GraclPlugin();
describe('tyranid-gracl', function () {
    before(function () {
        return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee() {
            return _regenerator2.default.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            Tyr.config({
                                db: db,
                                validate: [{ dir: root + '/test/models', fileMatch: '[a-z].js' }, { dir: root + '/lib/models', fileMatch: '[a-z].js' }],
                                secure: secure,
                                cls: false
                            });
                            _context.next = 3;
                            return createTestData_1.createTestData();

                        case 3:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this);
        }));
    });
    beforeEach(function () {
        return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee2() {
            return _regenerator2.default.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            Tyr.local.user = undefined;

                        case 1:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));
    });
    describe('utility functions', function () {
        it('should correctly find links using getCollectionLinksSorted', function () {
            var Chart = Tyr.byName['chart'],
                options = { direction: 'outgoing' },
                links = tyranidGracl.getCollectionLinksSorted(Chart, options);
            chai_1.expect(links, 'should produce sorted links').to.deep.equal(_.sortBy(Chart.links(options), function (field) {
                return field.link.def.name;
            }));
        });
        it('should find specific link using findLinkInCollection', function () {
            var Chart = Tyr.byName['chart'],
                User = Tyr.byName['user'],
                linkField = tyranidGracl.findLinkInCollection(Chart, User);
            chai_1.expect(linkField).to.exist;
            chai_1.expect(linkField.link.def.name).to.equal('user');
            chai_1.expect(linkField.spath).to.equal('userIds');
        });
        it('should correctly create formatted queries using createInQueries', function () {
            console.warn('ADD TEST');
        });
        it('should return correct ids after calling stepThroughCollectionPath', function () {
            console.warn('ADD TEST');
        });
    });
    describe('Creating the plugin', function () {
        it('should correctly produce paths between collections', function () {
            for (var a in expectedLinkPaths_1.expectedLinkPaths) {
                for (var b in expectedLinkPaths_1.expectedLinkPaths[a]) {
                    chai_1.expect(secure.getShortestPath(Tyr.byName[a], Tyr.byName[b]), 'Path from ' + a + ' to ' + b).to.deep.equal(expectedLinkPaths_1.expectedLinkPaths[a][b] || []);
                }
            }
        });
        it('should add permissions methods to documents', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee3() {
                var ben;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return Tyr.byName['user'].findOne({ name: 'ben' });

                            case 2:
                                ben = _context3.sent;

                                chai_1.expect(ben, 'should have method: $isAllowed').to.have.property('$isAllowed');
                                chai_1.expect(ben, 'should have method: $setPermissionAccess').to.have.property('$setPermissionAccess');
                                chai_1.expect(ben, 'should have method: $allow').to.have.property('$allow');
                                chai_1.expect(ben, 'should have method: $deny').to.have.property('$deny');

                            case 7:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));
        });
    });
    describe('Working with permissions', function () {
        it('should successfully add permissions', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee4() {
                var ben, chopped, updatedChopped, existingPermissions;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return Tyr.byName['user'].findOne({ name: 'ben' });

                            case 2:
                                ben = _context4.sent;
                                _context4.next = 5;
                                return Tyr.byName['organization'].findOne({ name: 'Chopped' });

                            case 5:
                                chopped = _context4.sent;

                                chai_1.expect(ben, 'ben should exist').to.exist;
                                chai_1.expect(chopped, 'chopped should exist').to.exist;
                                _context4.next = 10;
                                return tyranidGracl.PermissionsModel.setPermissionAccess(chopped, 'view-post', true, ben);

                            case 10:
                                updatedChopped = _context4.sent;
                                _context4.next = 13;
                                return tyranidGracl.PermissionsModel.find({}, null, { tyranid: { insecure: true } });

                            case 13:
                                existingPermissions = _context4.sent;

                                chai_1.expect(existingPermissions).to.have.lengthOf(1);
                                chai_1.expect(existingPermissions[0]['resourceId'].toString(), 'resourceId').to.equal(updatedChopped['permissions'][0]['resourceId'].toString());
                                chai_1.expect(existingPermissions[0]['subjectId'].toString(), 'subjectId').to.equal(updatedChopped['permissions'][0]['subjectId'].toString());
                                chai_1.expect(existingPermissions[0]['access']['view-post'], 'access').to.equal(updatedChopped['permissions'][0]['access']['view-post']);

                            case 18:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));
        });
        it('should respect permissions hierarchy', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee5() {
                var ben, choppedBlog;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return Tyr.byName['user'].findOne({ name: 'ben' });

                            case 2:
                                ben = _context5.sent;
                                _context5.next = 5;
                                return Tyr.byName['blog'].findOne({ name: 'Salads are great' });

                            case 5:
                                choppedBlog = _context5.sent;

                                chai_1.expect(ben, 'ben should exist').to.exist;
                                chai_1.expect(choppedBlog, 'choppedBlog should exist').to.exist;
                                _context5.t0 = chai_1;
                                _context5.next = 11;
                                return choppedBlog['$isAllowed']('view-post', ben);

                            case 11:
                                _context5.t1 = _context5.sent;

                                _context5.t0.expect.call(_context5.t0, _context5.t1, 'ben should have access to choppedBlog through access to chopped org').to.equal(true);

                            case 13:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));
        });
        it('should validate permissions', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee6() {
                var ben, chipotleCorporateBlog, threw, message;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                _context6.next = 2;
                                return Tyr.byName['user'].findOne({ name: 'ben' });

                            case 2:
                                ben = _context6.sent;
                                _context6.next = 5;
                                return Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });

                            case 5:
                                chipotleCorporateBlog = _context6.sent;

                                chai_1.expect(ben, 'ben should exist').to.exist;
                                chai_1.expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;
                                threw = false, message = '';
                                _context6.prev = 9;
                                _context6.next = 12;
                                return chipotleCorporateBlog['$isAllowed']('view', ben);

                            case 12:
                                _context6.next = 18;
                                break;

                            case 14:
                                _context6.prev = 14;
                                _context6.t0 = _context6['catch'](9);

                                threw = true;
                                message = _context6.t0.message;

                            case 18:
                                chai_1.expect(threw, 'checking \"view\" without collection should throw').to.equal(true);
                                chai_1.expect(message, 'Error message should contain "No collection name in permission type"').to.match(/No collection name in permission type/g);

                            case 20:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this, [[9, 14]]);
            }));
        });
        it('should modify existing permissions instead of creating new ones', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee7() {
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                console.warn('ADD TEST');

                            case 1:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));
        });
        it('should successfully remove all permissions after PermissionsModel.deletePermissions()', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee8() {
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                console.warn('ADD TEST');

                            case 1:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));
        });
    });
    describe('plugin.query()', function () {
        it('should return false with no user', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee9() {
                var Post, query;
                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                Post = Tyr.byName['post'];
                                _context9.next = 3;
                                return secure.query(Post, 'view');

                            case 3:
                                query = _context9.sent;

                                chai_1.expect(query, 'query should be false').to.equal(false);

                            case 5:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));
        });
        it('should return empty object for collection with no permissions hierarchy node', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee10() {
                var Chart, ben, query;
                return _regenerator2.default.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                Chart = Tyr.byName['chart'];
                                _context10.next = 3;
                                return Tyr.byName['user'].findOne({ name: 'ben' });

                            case 3:
                                ben = _context10.sent;
                                _context10.next = 6;
                                return secure.query(Chart, 'view', ben);

                            case 6:
                                query = _context10.sent;

                                chai_1.expect(query, 'query should be {}').to.deep.equal({});

                            case 8:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this);
            }));
        });
        it('should produce query restriction based on permissions', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee11() {
                var Post, Blog, Org, ben, chopped, choppedBlogs, query;
                return _regenerator2.default.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                Post = Tyr.byName['post'];
                                Blog = Tyr.byName['blog'];
                                Org = Tyr.byName['organization'];
                                _context11.next = 5;
                                return Tyr.byName['user'].findOne({ name: 'ben' });

                            case 5:
                                ben = _context11.sent;
                                _context11.next = 8;
                                return Org.findOne({ name: 'Chopped' });

                            case 8:
                                chopped = _context11.sent;
                                _context11.next = 11;
                                return Blog.find({ organizationId: chopped['_id'] }, { _id: 1 }, { tyranid: { insecure: true } });

                            case 11:
                                choppedBlogs = _context11.sent;
                                _context11.next = 14;
                                return secure.query(Post, 'view', ben);

                            case 14:
                                query = _context11.sent;

                                chai_1.expect(query, 'query should find correct blogs').to.deep.equal({
                                    blogId: { $in: _.map(choppedBlogs, '_id') }
                                });

                            case 16:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));
        });
        it('should produce query with primaryKey field set if permissions are directly set for collection', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee12() {
                return _regenerator2.default.wrap(function _callee12$(_context12) {
                    while (1) {
                        switch (_context12.prev = _context12.next) {
                            case 0:
                                console.warn('ADD TEST');

                            case 1:
                            case 'end':
                                return _context12.stop();
                        }
                    }
                }, _callee12, this);
            }));
        });
        it('should produce $and clause with excluded and included ids', function () {
            console.warn('ADD TEST');
        });
    });
    describe('Collection.find()', function () {
        it('should be appropriately filtered based on permissions', function () {
            return __awaiter(undefined, void 0, void 0, _regenerator2.default.mark(function _callee13() {
                var Post, User, Blog, Org, ben, postsBenCanSee, chopped, choppedBlogs, choppedPosts;
                return _regenerator2.default.wrap(function _callee13$(_context13) {
                    while (1) {
                        switch (_context13.prev = _context13.next) {
                            case 0:
                                Post = Tyr.byName['post'];
                                User = Tyr.byName['user'];
                                Blog = Tyr.byName['blog'];
                                Org = Tyr.byName['organization'];
                                _context13.next = 6;
                                return User.findOne({ name: 'ben' });

                            case 6:
                                ben = _context13.sent;

                                Tyr.local.user = ben;
                                _context13.next = 10;
                                return Post.find({});

                            case 10:
                                postsBenCanSee = _context13.sent;
                                _context13.next = 13;
                                return Org.findOne({ name: 'Chopped' });

                            case 13:
                                chopped = _context13.sent;
                                _context13.next = 16;
                                return Blog.find({ organizationId: chopped['_id'] }, { _id: 1 }, { tyranid: { insecure: true } });

                            case 16:
                                choppedBlogs = _context13.sent;
                                _context13.next = 19;
                                return Post.find({
                                    blogId: { $in: _.map(choppedBlogs, '_id') }
                                }, null, { tyranid: { insecure: true } });

                            case 19:
                                choppedPosts = _context13.sent;

                                chai_1.expect(postsBenCanSee, 'ben should only see chopped posts').to.deep.equal(choppedPosts);

                            case 21:
                            case 'end':
                                return _context13.stop();
                        }
                    }
                }, _callee13, this);
            }));
        });
        it('should default to lowest hierarchy permission', function () {
            console.warn('ADD TEST');
        });
    });
});