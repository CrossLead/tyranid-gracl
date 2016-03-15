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
    });
}
exports.createTestData = createTestData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0RGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3Qvc3BlYy9pbnNlcnREYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLHVCQUFxQixnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3RDLHVCQUFxQixnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3RDLHVCQUFxQixnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3RDLHVCQUFxQixnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3RDLCtCQUE2Qix3QkFBd0IsQ0FBQyxDQUFBO0FBRXREOztRQUdFLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNoQiwyQkFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDdkIsV0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDZixXQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNmLFdBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2YsV0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7U0FDaEIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUNKLFFBQVEsRUFDUixPQUFPLEVBQ1AsSUFBSSxDQUNMLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ3BCLDJCQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDO1lBQ3pDLDJCQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLDJCQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO1NBQ3RDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FDSixnQkFBZ0IsRUFDaEIscUJBQXFCLEVBQ3JCLFdBQVcsRUFDWCxRQUFRLENBQ1QsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDcEIsV0FBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3RFLFdBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hFLFdBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pFLFdBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1NBQ3hFLENBQUMsQ0FBQztJQUVMLENBQUM7O0FBakNxQixzQkFBYyxpQkFpQ25DLENBQUEifQ==