"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Blog_1 = require('../models/Blog');
const Post_1 = require('../models/Post');
const User_1 = require('../models/User');
const Team_1 = require('../models/Team');
const Organization_1 = require('../models/Organization');
function createTestData() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all([
            Organization_1.Organization.remove({}),
            Blog_1.Blog.remove({}),
            Post_1.Post.remove({}),
            Team_1.Team.remove({}),
            User_1.User.remove({})
        ]);
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
        console.log(yield Blog_1.Blog.find({}));
    });
}
exports.createTestData = createTestData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlVGVzdERhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L3NwZWMvY3JlYXRlVGVzdERhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsdUJBQXFCLGdCQUFnQixDQUFDLENBQUE7QUFDdEMsK0JBQTZCLHdCQUF3QixDQUFDLENBQUE7QUFFdEQ7O1FBRUUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2hCLDJCQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN2QixXQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNmLFdBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2YsV0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDZixXQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztTQUNoQixDQUFDLENBQUM7UUFFSCxNQUFNLENBQ0osUUFBUSxFQUNSLE9BQU8sRUFDUCxJQUFJLENBQ0wsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDcEIsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUM7WUFDekMsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDeEMsMkJBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7U0FDdEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUNKLGdCQUFnQixFQUNoQixxQkFBcUIsRUFDckIsV0FBVyxFQUNYLFFBQVEsQ0FDVCxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNwQixXQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEUsV0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEUsV0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekUsV0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7U0FDeEUsQ0FBQyxDQUFDO1FBR0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLFdBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDOztBQWxDcUIsc0JBQWMsaUJBa0NuQyxDQUFBIn0=