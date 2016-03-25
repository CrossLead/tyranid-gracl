"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const tyranid_1 = require('tyranid');
const Blog_1 = require('../models/Blog');
const User_1 = require('../models/User');
const Team_1 = require('../models/Team');
const Chart_1 = require('../models/Chart');
const Inventory_1 = require('../models/Inventory');
const Organization_1 = require('../models/Organization');
function createTestData() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(tyranid_1.default.collections.map(c => c.remove({})));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVGVzdERhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L2hlbHBlcnMvY3JlYXRlVGVzdERhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsMEJBQWdCLFNBQVMsQ0FBQyxDQUFBO0FBQzFCLHVCQUFxQixnQkFBZ0IsQ0FBQyxDQUFBO0FBRXRDLHVCQUFxQixnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3RDLHVCQUFxQixnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3RDLHdCQUFzQixpQkFBaUIsQ0FBQyxDQUFBO0FBQ3hDLDRCQUEwQixxQkFBcUIsQ0FBQyxDQUFBO0FBQ2hELCtCQUE2Qix3QkFBd0IsQ0FBQyxDQUFBO0FBRXREOztRQUVFLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBSzFELE1BQU0sQ0FDSixRQUFRLEVBQ1IsT0FBTyxFQUNQLElBQUksQ0FDTCxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNwQiwyQkFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQztZQUN6QywyQkFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQztZQUN4QywyQkFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztTQUN0QyxDQUFDLENBQUM7UUFLSCxNQUFNLENBQ0osaUJBQWlCLEVBQ2pCLGdCQUFnQixFQUNoQixhQUFhLENBQ2QsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDcEIscUJBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxRQUFRLENBQUMsR0FBRyxFQUFF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