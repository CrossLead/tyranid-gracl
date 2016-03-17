"use strict";

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

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
var Blog_1 = require('../models/Blog');
var Post_1 = require('../models/Post');
var User_1 = require('../models/User');
var Team_1 = require('../models/Team');
var Organization_1 = require('../models/Organization');
function createTestData() {
    return __awaiter(this, void 0, void 0, _regenerator2.default.mark(function _callee() {
        var _ref, _ref2, chipotle, chopped, cava, _ref3, _ref4, chipotleFoodBlog, chipotleCorporateBlog, choppedBlog, cavaBlog;

        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return _promise2.default.all([Organization_1.Organization.remove({}), Blog_1.Blog.remove({}), Post_1.Post.remove({}), Team_1.Team.remove({}), User_1.User.remove({})]);

                    case 2:
                        _context.next = 4;
                        return _promise2.default.all([Organization_1.Organization.insert({ name: 'Chipotle' }), Organization_1.Organization.insert({ name: 'Chopped' }), Organization_1.Organization.insert({ name: 'Cava' })]);

                    case 4:
                        _ref = _context.sent;
                        _ref2 = (0, _slicedToArray3.default)(_ref, 3);
                        chipotle = _ref2[0];
                        chopped = _ref2[1];
                        cava = _ref2[2];
                        _context.next = 11;
                        return _promise2.default.all([Blog_1.Blog.insert({ name: 'Burritos Etc', organizationId: chipotle['_id'] }), Blog_1.Blog.insert({ name: 'Mexican Empire', organizationId: chipotle['_id'] }), Blog_1.Blog.insert({ name: 'Salads are great', organizationId: chopped['_id'] }), Blog_1.Blog.insert({ name: 'Spinach + Lentils', organizationId: cava['_id'] })]);

                    case 11:
                        _ref3 = _context.sent;
                        _ref4 = (0, _slicedToArray3.default)(_ref3, 4);
                        chipotleFoodBlog = _ref4[0];
                        chipotleCorporateBlog = _ref4[1];
                        choppedBlog = _ref4[2];
                        cavaBlog = _ref4[3];

                    case 17:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));
}
exports.createTestData = createTestData;