import Tyr from 'tyranid';

export const PostBaseCollection = new Tyr.Collection({
  id: 'p00',
  name: 'post',
  dbName: 'posts',
  graclConfig: {
    permissions: {
      thisCollectionOnly: true
    }
  },
  fields: {
    _id: { is: 'mongoid' },
    title: { is: 'string' },
    text: { is: 'string' },
    blogId: {
      link: 'blog',
      relate: 'ownedBy',
      graclTypes: [ 'resource' ]
    }
  }
});

export class Post extends (<Tyr.CollectionInstance> PostBaseCollection) {

}
