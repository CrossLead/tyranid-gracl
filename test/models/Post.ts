import Tyr from 'tyranid';

export const PostBaseCollection = new Tyr.Collection({
  id: 'p00',
  name: 'post',
  dbName: 'posts',
  fields: {
    blogId: { link: 'blog', relates: 'ownedBy', direction: 'outgoing', graclType: 'resource' },
    permissions: { link: 'graclPermission' }
  }
});

export class Post extends (<Tyr.CollectionInstance> PostBaseCollection) {

}
