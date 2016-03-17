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
var chai_1 = require('chai');
var _1 = require('../../lib/');
var expectedLinkPaths_1 = require('./expectedLinkPaths');
var createTestData_1 = require('./createTestData');
var db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
    root = __dirname.replace(/test\/spec/, '');
var secure = _1.PermissionsModel.getGraclPlugin();
describe('tyranid-gracl', function () {
    before(function () {
        return __awaiter(this, void 0, void 0, _regenerator2.default.mark(function _callee() {
            return _regenerator2.default.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            this.timeout(10000);
                            secure.verbose = true;
                            Tyr.config({
                                db: db,
                                validate: [{ dir: root + '/test/models', fileMatch: '[a-z].js' }, { dir: root + '/lib/models', fileMatch: '[a-z].js' }],
                                secure: secure
                            });
                            _context.next = 5;
                            return createTestData_1.createTestData();

                        case 5:
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
});