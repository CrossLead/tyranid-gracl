import Tyr from 'tyranid';

const TeamBaseCollection = new Tyr.Collection({
  id: 't00',
  name: 'team',
  dbName: 'teams',
  fields: {
    name: { is: 'string' },
    organizationId: {
      link: 'organzization',
      relates: 'ownedBy',
      direction: 'outgoing',
      graclType: 'subject'
    },
    permissions: { link: 'graclPermission' }
  }
});


export class Team extends (<Tyr.CollectionInstance> TeamBaseCollection) {

}
