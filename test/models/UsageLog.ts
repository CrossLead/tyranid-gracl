import { Tyr } from 'tyranid';

export const UsageLogBaseCollection = new Tyr.Collection({
  id: 'ul0',
  name: 'usagelog',
  dbName: 'usagelogs',
  graclConfig: {
    types: [ 'resource', 'subject' ]
  },
  fields: {
    _id: { is: 'mongoid' },
    text: { is: 'string' }
  }
});

export class UsageLog extends (<Tyr.CollectionInstance> UsageLogBaseCollection) {

}
