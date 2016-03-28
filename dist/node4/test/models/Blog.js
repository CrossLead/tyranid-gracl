"use strict";

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
const tyranid_1 = require('tyranid');
const Post_1 = require('./Post');
exports.BlogBaseCollection = new tyranid_1.default.Collection({
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
        graclResourcePermissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Blog extends exports.BlogBaseCollection {
    static addPost(text, blog) {
        return __awaiter(this, void 0, void 0, function* () {
            const post = new Post_1.Post({ text: text, blogId: blog['_id'] });
            yield post.$save();
            return post;
        });
    }
}
exports.Blog = Blog;