import Tyr from 'tyranid';
import { Post } from './Post';

export const BlogBaseCollection = new Tyr.Collection({
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

export class Blog extends (<Tyr.CollectionInstance> BlogBaseCollection) {
  async addPost(text: string, blog: Tyr.Document) {
    const post = new Post({ text, blogId: blog['_id'] });
    await post.$save();
    return post;
  }
}
