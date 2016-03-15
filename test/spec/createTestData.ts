import { Blog } from '../models/Blog';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { Organization } from '../models/Organization';

export async function createTestData() {
  // nuke old data...
  await Promise.all([
    Organization.remove({}),
    Blog.remove({}),
    Post.remove({}),
    Team.remove({}),
    User.remove({})
  ]);

  const [
    chipotle,
    chopped,
    cava
  ] = await Promise.all([
    Organization.insert({ name: 'Chipotle' }),
    Organization.insert({ name: 'Chopped' }),
    Organization.insert({ name: 'Cava' })
  ]);

  const [
    chipotleFoodBlog,
    chipotleCorporateBlog,
    choppedBlog,
    cavaBlog
  ] = await Promise.all([
    Blog.insert({ name: 'Burritos Etc', organizationId: chipotle['_id'] }),
    Blog.insert({ name: 'Mexican Empire', organizationId: chipotle['_id'] }),
    Blog.insert({ name: 'Salads are great', organizationId: chopped['_id'] }),
    Blog.insert({ name: 'Spinach + Lentils', organizationId: cava['_id'] })
  ]);
}
