import * as Tyr from 'tyranid';

const TeamBaseCollection = new Tyr.Collection({
  id: 't00',
  name: 'team',
  dbName: 'teams',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: {
      link: 'organization',
      relates: 'ownedBy',
      direction: 'outgoing',
      graclType: 'subject'
    },
    permissions: { link: 'graclPermission' }
  }
});


export class Team extends (<Tyr.CollectionInstance> TeamBaseCollection) {

}
