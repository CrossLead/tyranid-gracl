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
class Post extends exports.PostBaseCollection {
}
exports.Post = Post;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL1Bvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBCQUFnQixTQUFTLENBQUMsQ0FBQTtBQUViLDBCQUFrQixHQUFHLElBQUksaUJBQUcsQ0FBQyxVQUFVLENBQUM7SUFDbkQsRUFBRSxFQUFFLEtBQUs7SUFDVCxJQUFJLEVBQUUsTUFBTTtJQUNaLE1BQU0sRUFBRSxPQUFPO0lBQ2YsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQ3ZCLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDdEIsTUFBTSxFQUFFO1lBQ04sSUFBSSxFQUFFLE1BQU07WUFDWixNQUFNLEVBQUUsU0FBUztZQUNqQixTQUFTLEVBQUUsVUFBVTtTQUN0QjtRQUNELGFBQWEsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFO0tBQ3hEO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsbUJBQW9ELDBCQUFtQjtBQUV2RSxDQUFDO0FBRlksWUFBSSxPQUVoQixDQUFBIn0=