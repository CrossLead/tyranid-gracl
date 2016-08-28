import { Tyr } from 'tyranid';

export const CommentBaseCollection = new Tyr.Collection({
  id: 'c0m',
  name: 'comment',
  dbName: 'comments',
  graclConfig: {
    permissions: {
      include: ['view-post', 'view-blog', 'view-comment']
    }
  },
  fields: {
    _id: { is: 'mongoid' },
    text: { is: 'string' },
    postId: {
      link: 'post',
      relate: 'ownedBy',
      graclTypes: [ 'resource' ]
    },
    blogId: { link: 'blog' }
  }
});

export class Comment extends (<Tyr.CollectionInstance> CommentBaseCollection) {

}
