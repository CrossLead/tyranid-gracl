import Tyr from 'tyranid';

const TeamBaseCollection = new Tyr.Collection({
  id: 't00',
  name: 'team',
  dbName: 'teams',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclTypes: ['subject', 'resource']
    }
  }
});


export class Team extends (<Tyr.CollectionInstance> TeamBaseCollection) {

}
