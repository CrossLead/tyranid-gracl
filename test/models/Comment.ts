import Tyr from 'tyranid';

export const CommentBaseCollection = new Tyr.Collection({
  id: 'c0m',
  name: 'comment',
  dbName: 'comments',
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
