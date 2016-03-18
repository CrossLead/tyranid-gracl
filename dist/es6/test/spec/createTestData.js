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
const Blog_1 = require('../models/Blog');
const User_1 = require('../models/User');
const Team_1 = require('../models/Team');
const Organization_1 = require('../models/Organization');
function createTestData() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(Tyr.collections.map(c => c.remove({})));
        const [chipotle, chopped, cava] = yield Promise.all([
            Organization_1.Organization.insert({ name: 'Chipotle' }),
            Organization_1.Organization.insert({ name: 'Chopped' }),
            Organization_1.Organization.insert({ name: 'Cava' })
        ]);
        const [chipotleFoodBlog, chipotleCorporateBlog, choppedBlog, cavaBlog] = yield Promise.all([
            Blog_1.Blog.insert({ name: 'Burritos Etc', organizationId: chipotle['_id'] }),
            Blog_1.Blog.insert({ name: 'Mexican Empire', organizationId: chipotle['_id'] }),
            Blog_1.Blog.insert({ name: 'Salads are great', organizationId: chopped['_id'] }),
            Blog_1.Blog.insert({ name: 'Spinach + Lentils', organizationId: cava['_id'] })
        ]);
        const [whyBurritosAreAmazing, ecoliChallenges, weDontKnowWhyPeopleGotSick] = yield Promise.all([
            Blog_1.Blog.addPost('whyBurritosAreAmazing', chipotleFoodBlog),
            Blog_1.Blog.addPost('ecoliChallenges', chipotleFoodBlog),
            Blog_1.Blog.addPost('weDontKnowWhyPeopleGotSick', chipotleFoodBlog)
        ]);
        const [burritoMakers, chipotleMarketing, choppedExec, cavaEngineers] = yield Promise.all([
            Team_1.Team.insert({ name: 'burritoMakers', organizationId: chipotle['_id'] }),
            Team_1.Team.insert({ name: 'chipotleMarketing', organizationId: chipotle['_id'] }),
            Team_1.Team.insert({ name: 'choppedExec', organizationId: chopped['_id'] }),
            Team_1.Team.insert({ name: 'cavaEngineers', organizationId: cava['_id'] })
        ]);
        const [ben, ted] = yield Promise.all([
            User_1.User.insert({
                name: 'ben',
                organizationId: chipotle['_id'],
                teamIds: [
                    burritoMakers['_id'],
                    chipotleMarketing['_id']
                ]
            }),
            User_1.User.insert({
                name: 'ted',
                organizationId: cava['_id'],
                teamIds: [
                    cavaEngineers['_id']
                ]
            })
        ]);
        return {
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
        };
    });
}
exports.createTestData = createTestData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVGVzdERhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L3NwZWMvY3JlYXRlVGVzdERhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDL0IsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFFdEMsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsK0JBQTZCLHdCQUF3QixDQUFDLENBQUE7QUFFdEQ7O1FBRUUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUsxRCxNQUFNLENBQ0osUUFBUSxFQUNSLE9BQU8sRUFDUCxJQUFJLENBQ0wsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDcEIsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUM7WUFDekMsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDeEMsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7U0FDdEMsQ0FBQyxDQUFDO1FBS0gsTUFBTSxDQUNKLGdCQUFnQixFQUNoQixxQkFBcUIsRUFDckIsV0FBVyxFQUNYLFFBQVEsQ0FDVCxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNwQixXQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEUsV0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUks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