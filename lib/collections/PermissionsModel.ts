/// <reference path='../../typings/main.d.ts' />
import * as Tyr from 'tyranid';


export const PermissionsBaseCollection = new Tyr.Collection({
  id: 'gcp',
  name: 'graclPermission',
  dbName: 'graclPermissions',
  fields: {
    _id: { is: 'mongoid' },
    subjectId: { is: 'uid' },
    resourceId: { is: 'uid' },
    subjectType: { is: 'string' },
    resourceType: { is: 'string' },
    access: {
      is: 'object',
      keys: { is: 'string' },
      of: { is: 'boolean' }
    }
  }
});


/**
  Collection to contain all permissions used by gracl

  Note: requires explicit cast to tyr.collectioninstance for tsc to pass
 */
export class PermissionsModel extends (<Tyr.CollectionInstance> PermissionsBaseCollection) {

  async setAccess(doc: Tyr.Document, access: boolean): Promise<Tyr.Document> {
    // manage permissions
    return doc;
  }

  async deletePermissionsForSubject(doc: Tyr.Document) {

  }

}
