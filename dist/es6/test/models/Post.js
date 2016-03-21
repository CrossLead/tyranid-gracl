"use strict";
const Tyr = require('tyranid');
exports.PostBaseCollection = new Tyr.Collection({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3QvbW9kZWxzL1Bvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE1BQVksR0FBRyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBRWxCLDBCQUFrQixHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUNuRCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxNQUFNO0lBQ1osTUFBTSxFQUFFLE9BQU87SUFDZixNQUFNLEVBQUU7UUFDTixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3RCLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDdkIsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUN0QixNQUFNLEVBQUU7WUFDTixJQUFJLEVBQUUsTUFBTTtZQUNaLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFNBQVMsRUFBRSxVQUFVO1NBQ3RCO1FBQ0QsYUFBYSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7S0FDeEQ7Q0FDRixDQUFDLENBQUM7QUFFSCxtQkFBb0QsMEJBQW1CO0FBRXZFLENBQUM7QUFGWSxZQUFJLE9BRWhCLENBQUEifQ==