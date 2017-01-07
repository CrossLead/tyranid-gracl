import { Tyr } from 'tyranid';

const OrganizationBaseCollection = new Tyr.Collection({
  id: 'o00',
  name: 'organization',
  dbName: 'organizations',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' }
  }
});

export class Organization extends (<Tyr.GenericCollection> OrganizationBaseCollection) {

}
