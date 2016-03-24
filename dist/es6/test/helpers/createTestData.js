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
const Chart_1 = require('../models/Chart');
const Inventory_1 = require('../models/Inventory');
const Organization_1 = require('../models/Organization');
function createTestData() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(Tyr.collections.map(c => c.remove({})));
        const [chipotle, chopped, cava] = yield Promise.all([
            Organization_1.Organization.insert({ name: 'Chipotle' }),
            Organization_1.Organization.insert({ name: 'Chopped' }),
            Organization_1.Organization.insert({ name: 'Cava' })
        ]);
        const [chipotleInventory, choppedInventory, cavaInventory] = yield Promise.all([
            Inventory_1.Inventory.insert({ name: 'Chipotle', organizationId: chipotle.$id }),
            Inventory_1.Inventory.insert({ name: 'Chopped', organizationId: chopped.$id }),
            Inventory_1.Inventory.insert({ name: 'Cava', organizationId: cava.$id })
        ]);
        const [chipotleFoodBlog, chipotleCorporateBlog, choppedBlog, cavaBlog] = yield Promise.all([
            Blog_1.Blog.insert({ name: 'Burritos Etc', organizationId: chipotle.$id }),
            Blog_1.Blog.insert({ name: 'Mexican Empire', organizationId: chipotle.$id }),
            Blog_1.Blog.insert({ name: 'Salads are great', organizationId: chopped.$id }),
            Blog_1.Blog.insert({ name: 'Spinach + Lentils', organizationId: cava.$id })
        ]);
        const [whyBurritosAreAmazing, ecoliChallenges, weDontKnowWhyPeopleGotSick, cleaningUp, burritoManagement, saladsAreGreat, guacGreens, lentilsAreGreat] = yield Promise.all([
            Blog_1.Blog.addPost('Why burritos are amazing.', chipotleFoodBlog),
            Blog_1.Blog.addPost('Ecoli challenges.', chipotleFoodBlog),
            Blog_1.Blog.addPost('We don\' actually know why people got sick.', chipotleFoodBlog),
            Blog_1.Blog.addPost('Re-evaluating the way we clean up.', chipotleCorporateBlog),
            Blog_1.Blog.addPost('Burrito Management, a new paradigm.', chipotleCorporateBlog),
            Blog_1.Blog.addPost('Salads are great, the post.', choppedBlog),
            Blog_1.Blog.addPost('Guacamole Greens to the rescue!.', choppedBlog),
            Blog_1.Blog.addPost('Lentils are great', cavaBlog)
        ]);
        const [burritoMakers, chipotleMarketing, choppedExec, cavaEngineers] = yield Promise.all([
            Team_1.Team.insert({ name: 'burritoMakers', organizationId: chipotle.$id }),
            Team_1.Team.insert({ name: 'chipotleMarketing', organizationId: chipotle.$id }),
            Team_1.Team.insert({ name: 'choppedExec', organizationId: chopped.$id }),
            Team_1.Team.insert({ name: 'cavaEngineers', organizationId: cava.$id })
        ]);
        const [ben, ted] = yield Promise.all([
            User_1.User.insert({
                name: 'ben',
                organizationId: chipotle.$id,
                teamIds: [
                    burritoMakers.$id,
                    chipotleMarketing.$id
                ]
            }),
            User_1.User.insert({
                name: 'ted',
                organizationId: cava.$id,
                teamIds: [
                    cavaEngineers.$id
                ]
            })
        ]);
        yield Promise.all([
            Chart_1.Chart.insert({
                name: 'test1',
                blogId: cavaBlog.$id,
                organizationId: cava.$id,
                userIds: [ben.$id, ted.$id]
            })
        ]);
    });
}
exports.createTestData = createTestData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVGVzdERhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L2hlbHBlcnMvY3JlYXRlVGVzdERhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDL0IsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFFdEMsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsd0JBQXNCLGlCQUFpQixDQUFDLENBQUE7QUFDeEMsNEJBQTBCLHFCQUFxQixDQUFDLENBQUE7QUFDaEQsK0JBQTZCLHdCQUF3QixDQUFDLENBQUE7QUFFdEQ7O1FBRUUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUsxRCxNQUFNLENBQ0osUUFBUSxFQUNSLE9BQU8sRUFDUCxJQUFJLENBQ0wsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDcEIsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUM7WUFDekMsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDeEMsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7U0FDdEMsQ0FBQyxDQUFDO1FBS0gsTUFBTSxDQUNKLGlCQUFpQixFQUNqQixnQkFBZ0IsRUFDaEIsYUFBYSxDQUNkLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ3BCLHFCQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsUUFBUSxDQUFDLEdB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