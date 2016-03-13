/// <reference path='../../typings/main.d.ts' />
import Tyr from 'tyranid';


export const PermissionsBaseCollection = new Tyr.Collection({
  id: 'gcp',
  name: 'graclPermission',
  dbName: 'graclPermissions',
  fields: {
    subjectId: { is: 'uid' },
    resourceId: { is: 'resourceId'},
    subjectType: { is: 'string' },
    resourceType: { is: 'string' },
    access: {
      is: 'object',
      keys: { is: 'string' },
      of: { is: 'boolean '}
    }
  }
});


export class PermissionsModel extends (<Tyr.CollectionInstance> PermissionsBaseCollection) {

  setAccess(doc: Tyr.Document, access: boolean): Tyr.Document {
    // manage permissions
    return doc;
  }

}
