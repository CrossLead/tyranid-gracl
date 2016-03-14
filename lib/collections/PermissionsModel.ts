/// <reference path='../../typings/main.d.ts' />
import * as Tyr from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';


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


let graclPluginInstance: GraclPlugin;

/**
  Collection to contain all permissions used by gracl

  Note: requires explicit cast to tyr.collectioninstance for tsc to pass
 */
export class PermissionsModel extends (<Tyr.CollectionInstance> PermissionsBaseCollection) {

  static async setAccess(doc: Tyr.Document, access: boolean): Promise<Tyr.Document> {
    // manage permissions
    return doc;
  }

  static async updatePermissions(doc: Tyr.Document, graclType: string) {

  }

  static async deletePermissions(doc: Tyr.Document, graclType: string) {

  }

  static getGraclPlugin() {
    return graclPluginInstance || (graclPluginInstance = new GraclPlugin());
  }

}
