/// <reference path='../../typings/main.d.ts' />
import * as _ from 'lodash';
import * as Tyr from 'tyranid';
import * as gracl from 'gracl';
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


/**
  Collection to contain all permissions used by gracl

  Note: requires explicit cast to tyr.collectioninstance for tsc to pass
 */
export class PermissionsModel extends (<Tyr.CollectionInstance> PermissionsBaseCollection) {

  static async setPermission(
      resourceDocument: Tyr.Document,
      permissionType: string,
      access: boolean,
      subjectDocument = Tyr.local.user
    ): Promise<Tyr.Document> {

    if (!resourceDocument) {
      throw new Error('No resource provided to setPermission()!');
    }

    if (!subjectDocument) {
      throw new Error('No subject provided to setPermission() (or Tyr.local.user is unavailable)!');
    }

    // extract secure and cast to plugin
    const plugin = <GraclPlugin> Tyr.secure;

    const resourceCollectionName = resourceDocument.$model.def.name,
          subjectCollectionName = subjectDocument.$model.def.name;

    // extract subject and resource Gracl classes
    const ResourceClass = plugin.graclHierarchy.getResource(resourceCollectionName),
          SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);

    if (!ResourceClass) {
      throw new Error(
        `Attempted to set permission using ${resourceCollectionName} as resource, ` +
        `no relevant resource class found in tyranid-gracl plugin!`
      );
    }

    if (!SubjectClass) {
      throw new Error(
        `Attempted to set permission using ${subjectCollectionName} as subject, ` +
        `no relevant subject class found in tyranid-gracl plugin!`
      );
    }

    // manage permissions
    return await PermissionsModel.updatePermissions(resourceDocument);
  }


  /**
   *  Given a tyranid document <doc>, update its permissions based
      on doc.permissions

      TODO: add uniqueness check?
   */
  static async updatePermissions(doc: Tyr.Document): Promise<Tyr.Document> {
    const permissions         = <gracl.Permission[]> _.get(doc, 'permissions', []),
          existingPermissions = <gracl.Permission[]> [],
          newPermissions      = <gracl.Permission[]> [],
          updated             = <Tyr.Document[]> [],
          permIdField         = PermissionsModel.def.primaryKey.field;

    const uniquenessCheck = new Set();

    // validate + partition
    _.each(permissions, perm => {
      if (!perm.resourceId) throw new Error(`Tried to add permission for ${doc.$uid} without resourceId!`);
      if (!perm.subjectId) throw new Error(`Tried to add permission for ${doc.$uid} without subjectId!`);

      const hash = `${perm.resourceId}-${perm.subjectId}`;
      if (uniquenessCheck.has(hash)) {
        throw new Error(
          `Attempted to set duplicate permission for combination of ` +
          `resource = ${perm.resourceId}, subject = ${perm.subjectId}`
        );
      }
      if (perm[permIdField]) {
        existingPermissions.push(perm);
      } else {
        newPermissions.push(perm);
      }
    });

    updated.push(...(await Promise.all(existingPermissions.map(perm => {
      return PermissionsModel.findAndModify({
        query: { [permIdField]: perm[permIdField] },
        update: { $set: perm },
        new: true
      });
    }))));

    updated.push(...(await Promise.all(newPermissions.map(perm => {
      const p = new PermissionsModel(perm);
      return p.$save();
    }))));

    delete doc['permissions'];

    // extract all the ids from the updated permissions
    doc['permissionIds'] = _.map(updated, permIdField);

    // remove permissions for this resource that are not in the given ids
    await PermissionsModel.remove({
      [permIdField]: { $nin: doc['permissionIds'] },
      resourceId: doc.$uid
    });

    return doc.$save();
  };


  /**
   *  Given a uid, remove all permissions relating to that entity in the system
   */
  static async deletePermissions(uid: string) {

  }


}
