"use strict";

const tyranid_1 = require('tyranid');
exports.PostBaseCollection = new tyranid_1.default.Collection({
    id: 'p00',
    name: 'post',
    dbName: 'posts',
    fields: {
        _id: { is: 'mongoid' },
        title: { is: 'string' },
        text: { is: 'string' },
        blogId: {
            link: 'blog',
            relate: 'ownedBy',
            graclType: 'resource'
        },
        permissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Post extends exports.PostBaseCollection {}
exports.Post = Post;