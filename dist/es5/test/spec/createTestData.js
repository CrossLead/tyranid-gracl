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
var Tyr = require('tyranid');
var Blog_1 = require('../models/Blog');
var User_1 = require('../models/User');
var Team_1 = require('../models/Team');
var Organization_1 = require('../models/Organization');
function createTestData() {
    return __awaiter(this, void 0, void 0, _regenerator2.default.mark(function _callee() {
        var _ref, _ref2, chipotle, chopped, cava, _ref3, _ref4, chipotleFoodBlog, chipotleCorporateBlog, choppedBlog, cavaBlog, _ref5, _ref6, whyBurritosAreAmazing, ecoliChallenges, weDontKnowWhyPeopleGotSick, _ref7, _ref8, burritoMakers, chipotleMarketing, choppedExec, cavaEngineers, _ref9, _ref10, ben, ted;

        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return _promise2.default.all(Tyr.collections.map(function (c) {
                            return c.remove({});
                        }));

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
                        _context.next = 19;
                        return _promise2.default.all([Blog_1.Blog.addPost('whyBurritosAreAmazing', chipotleFoodBlog), Blog_1.Blog.addPost('ecoliChallenges', chipotleFoodBlog), Blog_1.Blog.addPost('weDontKnowWhyPeopleGotSick', chipotleFoodBlog)]);

                    case 19:
                        _ref5 = _context.sent;
                        _ref6 = (0, _slicedToArray3.default)(_ref5, 3);
                        whyBurritosAreAmazing = _ref6[0];
                        ecoliChallenges = _ref6[1];
                        weDontKnowWhyPeopleGotSick = _ref6[2];
                        _context.next = 26;
                        return _promise2.default.all([Team_1.Team.insert({ name: 'burritoMakers', organizationId: chipotle['_id'] }), Team_1.Team.insert({ name: 'chipotleMarketing', organizationId: chipotle['_id'] }), Team_1.Team.insert({ name: 'choppedExec', organizationId: chopped['_id'] }), Team_1.Team.insert({ name: 'cavaEngineers', organizationId: cava['_id'] })]);

                    case 26:
                        _ref7 = _context.sent;
                        _ref8 = (0, _slicedToArray3.default)(_ref7, 4);
                        burritoMakers = _ref8[0];
                        chipotleMarketing = _ref8[1];
                        choppedExec = _ref8[2];
                        cavaEngineers = _ref8[3];
                        _context.next = 34;
                        return _promise2.default.all([User_1.User.insert({
                            name: 'ben',
                            organizationId: chipotle['_id'],
                            teamIds: [burritoMakers['_id'], chipotleMarketing['_id']]
                        }), User_1.User.insert({
                            name: 'ted',
                            organizationId: cava['_id'],
                            teamIds: [cavaEngineers['_id']]
                        })]);

                    case 34:
                        _ref9 = _context.sent;
                        _ref10 = (0, _slicedToArray3.default)(_ref9, 2);
                        ben = _ref10[0];
                        ted = _ref10[1];
                        return _context.abrupt('return', {
                            chipotle: chipotle,
                            chopped: chopped,
                            cava: cava,
                            chipotleFoodBlog: chipotleFoodBlog,
                            chipotleCorporateBlog: chipotleCorporateBlog,
                            choppedBlog: choppedBlog,
                            cavaBlog: cavaBlog,
                            whyBurritosAreAmazing: whyBurritosAreAmazing,
                            ecoliChallenges: ecoliChallenges,
                            weDontKnowWhyPeopleGotSick: weDontKnowWhyPeopleGotSick,
                            burritoMakers: burritoMakers,
                            chipotleMarketing: chipotleMarketing,
                            choppedExec: choppedExec,
                            cavaEngineers: cavaEngineers,
                            ben: ben,
                            ted: ted
                        });

                    case 39:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));
}
exports.createTestData = createTestData;