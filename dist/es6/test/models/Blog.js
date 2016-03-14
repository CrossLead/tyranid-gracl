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
const Post_1 = require('./Post');
exports.BlogBaseCollection = new tyranid_1.default.Collection({
    id: 'b00',
    name: 'blog',
    dbName: 'blogs',
    fields: {
        organizationId: {
            link: 'organzization',
            relates: 'ownedBy',
            direction: 'outgoing',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmxvZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL0Jsb2cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsMEJBQWdCLFNBQVMsQ0FBQyxDQUFBO0FBQzFCLHVCQUFxQixRQUFRLENBQUMsQ0FBQTtBQUVqQiwwQkFBa0IsR0FBRyxJQUFJLGlCQUFHLENBQUMsVUFBVSxDQUFDO0lBQ25ELEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLE1BQU07SUFDWixNQUFNLEVBQUUsT0FBTztJQUNmLE1BQU0sRUFBRTtRQUNOLGNBQWMsRUFBRTtZQUNkLElBQUksRUFBRSxlQUFlO1lBQ3JCLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLFNBQVMsRUFBRSxVQUFVO1lBQ3JCLFNBQVMsRUFBRSxVQUFVO1NBQ3RCO1FBQ0QsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFO0tBQ3pDO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsbUJBQW9ELDBCQUFtQjtJQUMvRCxPQUFPLENBQUMsSUFBWSxFQUFFLElBQWtCOztZQUM1QyxNQUFNLElBQUksR0FBRyxJQUFJLFdBQUksQ0FBQyxFQUFFLE1BQUEsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JELE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDZCxDQUFDO0tBQUE7QUFDSCxDQUFDO0FBTlksWUFBSSxPQU1oQixDQUFBIn0=