/// <reference path='../../typings/main.d.ts' />
import Tyr from 'tyranid';


const BaseCollection = new Tyr.Collection({
  id: 'gcp',
  name: '_graclPermissions',
  dbName: '_graclPermissions',
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



class PermissionsModel extends BaseCollection {

}



export class GraclPlugin {

  /**
   *  Method for creating a specific query based on a schema object
   */
  query(collection: Tyr.Collection, permission: string) {

  }

}
