import * as Tyr from 'tyranid';

export const UsageLogBaseCollection = new Tyr.Collection({
  id: 'ul0',
  name: 'usagelog',
  dbName: 'usagelogs',
  fields: {
    _id: { is: 'mongoid' },
    text: { is: 'string' },
    permissionIds: { is: 'array', link: 'graclPermission', graclType: [ 'subject', 'resource' ] }
  }
});

export class UsageLog extends (<Tyr.CollectionInstance> UsageLogBaseCollection) {

}
