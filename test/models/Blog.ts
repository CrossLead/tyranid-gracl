import * as Tyr from 'tyranid';
import { Post } from './Post';

export const BlogBaseCollection = new Tyr.Collection({
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
    permissionIds: { is: 'array', link: 'graclPermission' }
  }
});

export class Blog extends (<Tyr.CollectionInstance> BlogBaseCollection) {
  static async addPost(text: string, blog: Tyr.Document) {
    const post = new Post({ text, blogId: blog['_id'] });
    await post.$save();
    return post;
  }
}
