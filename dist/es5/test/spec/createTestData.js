"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
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
    return __awaiter(this, void 0, void 0, regeneratorRuntime.mark(function _callee() {
        var _ref, _ref2, chipotle, chopped, cava, _ref3, _ref4, chipotleFoodBlog, chipotleCorporateBlog, choppedBlog, cavaBlog;

        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return Promise.all([Organization_1.Organization.remove({}), Blog_1.Blog.remove({}), Post_1.Post.remove({}), Team_1.Team.remove({}), User_1.User.remove({})]);

                    case 2:
                        _context.next = 4;
                        return Promise.all([Organization_1.Organization.insert({ name: 'Chipotle' }), Organization_1.Organization.insert({ name: 'Chopped' }), Organization_1.Organization.insert({ name: 'Cava' })]);

                    case 4:
                        _ref = _context.sent;
                        _ref2 = _slicedToArray(_ref, 3);
                        chipotle = _ref2[0];
                        chopped = _ref2[1];
                        cava = _ref2[2];
                        _context.next = 11;
                        return Promise.all([Blog_1.Blog.insert({ name: 'Burritos Etc', organizationId: chipotle['_id'] }), Blog_1.Blog.insert({ name: 'Mexican Empire', organizationId: chipotle['_id'] }), Blog_1.Blog.insert({ name: 'Salads are great', organizationId: chopped['_id'] }), Blog_1.Blog.insert({ name: 'Spinach + Lentils', organizationId: cava['_id'] })]);

                    case 11:
                        _ref3 = _context.sent;
                        _ref4 = _slicedToArray(_ref3, 4);
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