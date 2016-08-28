import { Tyr } from 'tyranid';

export const ChartBaseCollection = new Tyr.Collection({
  id: 'c00',
  name: 'chart',
  dbName: 'charts',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: {
      link: 'organization'
    },
    blogId: {
      link: 'blog'
    },
    postIds: {
      is: 'array', of: { link: 'post' }
    },
    teamIds: {
      is: 'array', of: { link: 'team' }
    },
    userIds: {
      is: 'array', of: { link: 'user' }
    }
  }
});

export class Chart extends (<Tyr.CollectionInstance> ChartBaseCollection) {

}
