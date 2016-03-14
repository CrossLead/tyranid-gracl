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
const Post_1 = require('./Post');
exports.BlogBaseCollection = new Tyr.Collection({
    id: 'b00',
    name: 'blog',
    dbName: 'blogs',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        organizationId: {
            link: 'organization',
            relate: 'ownedBy',
            graclType: 'resource'
        },
        permissions: { link: 'graclPermission' }
    }
});
class Blog extends exports.BlogBaseCollection {
    addPost(text, blog) {
        return __awaiter(this, void 0, void 0, function* () {
            const post = new Post_1.Post({ text: text, blogId: blog['_id'] });
            yield post.$save();
            return post;
        });
    }
}
exports.Blog = Blog;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmxvZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL0Jsb2cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFDL0IsdUJBQXFCLFFBQVEsQ0FBQyxDQUFBO0FBRWpCLDBCQUFrQixHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUNuRCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxNQUFNO0lBQ1osTUFBTSxFQUFFLE9BQU87SUFDZixNQUFNLEVBQUU7UUFDTixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3RCLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDdEIsY0FBYyxFQUFFO1lBQ2QsSUFBSSxFQUFFLGNBQWM7WUFDcEIsTUFBTSxFQUFFLFNBQVM7WUFDakIsU0FBUyxFQUFFLFVBQVU7U0FDdEI7UUFDRCxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7S0FDekM7Q0FDRixDQUFDLENBQUM7QUFFSCxtQkFBb0QsMEJBQW1CO0lBQy9ELE9BQU8sQ0FBQyxJQUFZLEVBQUUsSUFBa0I7O1lBQzVDLE1BQU0sSUFBSSxHQUFHLElBQUksV0FBSSxDQUFDLEVBQUUsTUFBQSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDckQsTUFBTSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUM7S0FBQTtBQUNILENBQUM7QUFOWSxZQUFJLE9BTWhCLENBQUEifQ==