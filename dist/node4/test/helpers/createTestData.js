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
const Tyr = require('tyranid');
const Blog_1 = require('../models/Blog');
const User_1 = require('../models/User');
const Team_1 = require('../models/Team');
const Inventory_1 = require('../models/Inventory');
const Organization_1 = require('../models/Organization');
function createTestData() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(Tyr.collections.map(c => c.remove({})));

        var _ref = yield Promise.all([Organization_1.Organization.insert({ name: 'Chipotle' }), Organization_1.Organization.insert({ name: 'Chopped' }), Organization_1.Organization.insert({ name: 'Cava' })]);

        var _ref2 = _slicedToArray(_ref, 3);

        const chipotle = _ref2[0];
        const chopped = _ref2[1];
        const cava = _ref2[2];

        var _ref3 = yield Promise.all([Inventory_1.Inventory.insert({ name: 'Chipotle', organizationId: chipotle['_id'] }), Inventory_1.Inventory.insert({ name: 'Chopped', organizationId: chopped['_id'] }), Inventory_1.Inventory.insert({ name: 'Cava', organizationId: cava['_id'] })]);

        var _ref4 = _slicedToArray(_ref3, 3);

        const chipotleInventory = _ref4[0];
        const choppedInventory = _ref4[1];
        const cavaInventory = _ref4[2];

        var _ref5 = yield Promise.all([Blog_1.Blog.insert({ name: 'Burritos Etc', organizationId: chipotle['_id'] }), Blog_1.Blog.insert({ name: 'Mexican Empire', organizationId: chipotle['_id'] }), Blog_1.Blog.insert({ name: 'Salads are great', organizationId: chopped['_id'] }), Blog_1.Blog.insert({ name: 'Spinach + Lentils', organizationId: cava['_id'] })]);

        var _ref6 = _slicedToArray(_ref5, 4);

        const chipotleFoodBlog = _ref6[0];
        const chipotleCorporateBlog = _ref6[1];
        const choppedBlog = _ref6[2];
        const cavaBlog = _ref6[3];

        var _ref7 = yield Promise.all([Blog_1.Blog.addPost('Why burritos are amazing.', chipotleFoodBlog), Blog_1.Blog.addPost('Ecoli challenges.', chipotleFoodBlog), Blog_1.Blog.addPost('We don\' actually know why people got sick.', chipotleFoodBlog), Blog_1.Blog.addPost('Re-evaluating the way we clean up.', chipotleCorporateBlog), Blog_1.Blog.addPost('Burrito Management, a new paradigm.', chipotleCorporateBlog), Blog_1.Blog.addPost('Salads are great.', choppedBlog), Blog_1.Blog.addPost('Guacamole Greens to the rescue!.', choppedBlog), Blog_1.Blog.addPost('Lentils are great', cavaBlog)]);

        var _ref8 = _slicedToArray(_ref7, 8);

        const whyBurritosAreAmazing = _ref8[0];
        const ecoliChallenges = _ref8[1];
        const weDontKnowWhyPeopleGotSick = _ref8[2];
        const cleaningUp = _ref8[3];
        const burritoManagement = _ref8[4];
        const saladsAreGreat = _ref8[5];
        const guacGreens = _ref8[6];
        const lentilsAreGreat = _ref8[7];

        var _ref9 = yield Promise.all([Team_1.Team.insert({ name: 'burritoMakers', organizationId: chipotle['_id'] }), Team_1.Team.insert({ name: 'chipotleMarketing', organizationId: chipotle['_id'] }), Team_1.Team.insert({ name: 'choppedExec', organizationId: chopped['_id'] }), Team_1.Team.insert({ name: 'cavaEngineers', organizationId: cava['_id'] })]);

        var _ref10 = _slicedToArray(_ref9, 4);

        const burritoMakers = _ref10[0];
        const chipotleMarketing = _ref10[1];
        const choppedExec = _ref10[2];
        const cavaEngineers = _ref10[3];

        var _ref11 = yield Promise.all([User_1.User.insert({
            name: 'ben',
            organizationId: chipotle['_id'],
            teamIds: [burritoMakers['_id'], chipotleMarketing['_id']]
        }), User_1.User.insert({
            name: 'ted',
            organizationId: cava['_id'],
            teamIds: [cavaEngineers['_id']]
        })]);

        var _ref12 = _slicedToArray(_ref11, 2);

        const ben = _ref12[0];
        const ted = _ref12[1];
    });
}
exports.createTestData = createTestData;