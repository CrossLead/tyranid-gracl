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
            Inventory_1.Inventory.insert({ name: 'Chipotle', organizationId: chipotle['_id'] }),
            Inventory_1.Inventory.insert({ name: 'Chopped', organizationId: chopped['_id'] }),
            Inventory_1.Inventory.insert({ name: 'Cava', organizationId: cava['_id'] })
        ]);
        const [chipotleFoodBlog, chipotleCorporateBlog, choppedBlog, cavaBlog] = yield Promise.all([
            Blog_1.Blog.insert({ name: 'Burritos Etc', organizationId: chipotle['_id'] }),
            Blog_1.Blog.insert({ name: 'Mexican Empire', organizationId: chipotle['_id'] }),
            Blog_1.Blog.insert({ name: 'Salads are great', organizationId: chopped['_id'] }),
            Blog_1.Blog.insert({ name: 'Spinach + Lentils', organizationId: cava['_id'] })
        ]);
        const [whyBurritosAreAmazing, ecoliChallenges, weDontKnowWhyPeopleGotSick, cleaningUp, burritoManagement] = yield Promise.all([
            Blog_1.Blog.addPost('Why burritos are amazing.', chipotleFoodBlog),
            Blog_1.Blog.addPost('Ecoli challenges.', chipotleFoodBlog),
            Blog_1.Blog.addPost('We don\' actually know why people got sick.', chipotleFoodBlog),
            Blog_1.Blog.addPost('Re-evaluating the way we clean up.', chipotleCorporateBlog),
            Blog_1.Blog.addPost('Burrito Management, a new paradigm.', chipotleCorporateBlog),
            Blog_1.Blog.addPost('Salads are great.', chopped),
            Blog_1.Blog.addPost('Guacamole Greens to the rescue!.', chopped),
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
    });
}
exports.createTestData = createTestData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVGVzdERhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L3NwZWMvY3JlYXRlVGVzdERhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDL0IsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFFdEMsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsNEJBQTBCLHFCQUFxQixDQUFDLENBQUE7QUFDaEQsK0JBQTZCLHdCQUF3QixDQUFDLENBQUE7QUFFdEQ7O1FBRUUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUsxRCxNQUFNLENBQ0osUUFBUSxFQUNSLE9BQU8sRUFDUCxJQUFJLENBQ0wsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDcEIsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUM7WUFDekMsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDeEMsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7U0FDdEMsQ0FBQyxDQUFDO1FBS0gsTUFBTSxDQUNKLGlCQUFpQixFQUNqQixnQkFBZ0IsRUFDaEIsYUFBYSxDQUNkLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ3BCLHFCQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkUscUJBQVMsQ0FB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