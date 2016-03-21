import * as Tyr from 'tyranid';

export const PostBaseCollection = new Tyr.Collection({
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

export class Post extends (<Tyr.CollectionInstance> PostBaseCollection) {

}
