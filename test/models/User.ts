import Tyr from 'tyranid';


const UserBaseCollection = new Tyr.Collection({
  id: 'u00',
  name: 'user',
  dbName: 'users',
  fields: {
    name: { is: 'string' },
    teamIds: {
      is: 'array',
      of: {
        link: 'team',
        relates: 'ownedBy',
        direction: 'outgoing',
        graclType: 'subject'
      }
    },
    organizationId: { link: 'organization' },
    permissions: { link: 'graclPermission' }
  }
});


export class User extends (<Tyr.CollectionInstance> UserBaseCollection) {

}
