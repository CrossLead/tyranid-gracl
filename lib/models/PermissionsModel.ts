/// <reference path='../../typings/main.d.ts' />
import * as _ from 'lodash';
import * as Tyr from 'tyranid';
import * as gracl from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
import { PermissionLocks } from './PermissionsLocks';

export const PermissionsBaseCollection = new Tyr.Collection({
  id: '_gp',
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


  static validPermissionActions = new Set(['view', 'edit', 'update', 'delete']);


  static getGraclPlugin(): GraclPlugin {
    const plugin = <GraclPlugin> Tyr.secure;
    if (!plugin) {
      throw new Error(`No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!`);
    }
    return plugin;
  }


  static validatePermissionType(permissionType: string, queriedCollection: Tyr.CollectionInstance) {
    const [ action, collectionName ] = permissionType.split('-'),
          { validPermissionActions } = PermissionsModel;

    if (!collectionName) {
      throw new Error(
        `Invalid permissionType ${permissionType}! ` +
        `No collection name in permission type, permissions must be formatted as <action>-<collection>`
      );
    }

    if (!validPermissionActions.has(action)) {
      throw new Error(
        `Invalid permissionType ${permissionType}! ` +
        `permission action given ${action} is not valid. Must be one of ${[...validPermissionActions].join(', ')}`
      );
    }

    const plugin = PermissionsModel.getGraclPlugin();

    PermissionsModel.validateAsResource(Tyr.byName[collectionName]);
    PermissionsModel.validateAsResource(queriedCollection);

    const queriedResourceHierarchy = plugin
      .graclHierarchy
      .getResource(queriedCollection.def.name)
      .getHierarchyClassNames();

    const permissionResourceHierarchy = plugin
      .graclHierarchy
      .getResource(collectionName)
      .getHierarchyClassNames();

    /** ensure that one collection is in another's hierarchy
      TODO: Not sure if this level of check is necessary for performance hit
     */
    if (!(
          _.contains(permissionResourceHierarchy, queriedCollection.def.name) ||
          _.contains(queriedResourceHierarchy, collectionName)
        )) {
      throw new Error(
        `Cannot set permission "${permissionType}" on collection ` +
        `"${collectionName}" as resource, as collection "${queriedCollection.def.name}" ` +
        `does not exist in the resource hierarchy of "${collectionName}"`
      );
    }
  }


  static validateAsResource(collection: Tyr.CollectionInstance) {
    const plugin = PermissionsModel.getGraclPlugin();

    if (!collection) {
      throw new Error(`Attempted to validate undefined collection!`);
    }

    if (!plugin.graclHierarchy.resources.has(collection.def.name)) {
      throw new Error(
        `Attempted to set/get permission using ${collection.def.name} as resource, ` +
        `no relevant resource class found in tyranid-gracl plugin!`
      );
    }
  }


  static async getGraclClasses(
    resourceDocument: Tyr.Document,
    subjectDocument: Tyr.Document
    ): Promise<{
      subject: gracl.Subject,
      resource: gracl.Resource
    }> {

    if (!(resourceDocument && resourceDocument.$uid)) {
      throw new Error('No resource document provided!');
    }

    if (!(subjectDocument && subjectDocument.$uid)) {
      throw new Error('No subject document provided (or Tyr.local.user is unavailable)!');
    }

    // extract secure and cast to plugin
    const plugin = PermissionsModel.getGraclPlugin();

    const resourceCollectionName = resourceDocument.$model.def.name,
          subjectCollectionName = subjectDocument.$model.def.name;

    if (!resourceDocument['permissions']) {
      await Tyr.byName[resourceCollectionName].populate('permissionIds', resourceDocument);
    }

    // extract subject and resource Gracl classes
    const ResourceClass = plugin.graclHierarchy.getResource(resourceCollectionName),
          SubjectClass = plugin.graclHierarchy.getSubject(subjectCollectionName);

    if (!ResourceClass) {
      throw new Error(
        `Attempted to set/get permission using ${resourceCollectionName} as resource, ` +
        `no relevant resource class found in tyranid-gracl plugin!`
      );
    }

    if (!SubjectClass) {
      throw new Error(
        `Attempted to set/get permission using ${subjectCollectionName} as subject, ` +
        `no relevant subject class found in tyranid-gracl plugin!`
      );
    }

    /**
     *  Instantiate gracl objects and set permission
     */
    const subject = new SubjectClass(subjectDocument),
          resource = new ResourceClass(resourceDocument);

    return { subject, resource };
  }


  static async setPermissionAccess(
      resourceDocument: Tyr.Document,
      permissionType: string,
      access: boolean,
      subjectDocument = Tyr.local.user
    ): Promise<Tyr.Document> {
    PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);

    const { subject, resource } = await PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);

    // setPermissionAccess calls resource.getClass().repository.saveEntity()
    // which in turn calls PermissionsModel.updatePermissions(doc)
    await resource.setPermissionAccess(subject, permissionType, access);

    // manage permissions
    return <Tyr.Document> resource.doc;
  }


  static async isAllowed(
      resourceDocument: Tyr.Document,
      permissionType: string,
      subjectDocument = Tyr.local.user
    ): Promise<boolean> {
    PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);

    const { subject, resource } = await PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);

    return await resource.isAllowed(subject, permissionType);
  }


  /**
   *  Given a resource document, attempt to create a lock. If one exists (and is set to true) throw error
   */
  static async lockPermissionsForResource(resourceDocument: Tyr.Document): Promise<void> {
    if (!(resourceDocument && resourceDocument.$uid)) {
      throw new Error('No resource document provided!');
    }

    const lock = await PermissionLocks.findAndModify({
      query: {
        resourceId: resourceDocument.$uid
      },
      update: {
        $set: {
          locked: true
        }
      },
      new: false,
      upsert: true
    });

    /**
     *  Check if we are already updating permissions for this resource
     */
    if (lock['value'] && lock['value']['locked'] === true) {
      throw new Error(
        `Cannot update permissions for resource ${resourceDocument.$uid} as another update is in progress!`
      );
    }
  }



  /**
   *  Given a resource document, attempt to unlock permissions. If no lock exists throw error
   */
  static async unlockPermissionsForResource(resourceDocument: Tyr.Document): Promise<void> {
    if (!(resourceDocument && resourceDocument.$uid)) {
      throw new Error('No resource document provided!');
    }

    const lock = await PermissionLocks.findAndModify({
      query: {
        resourceId: resourceDocument.$uid
      },
      update: {
        $set: {
          locked: false
        }
      },
      new: false,
      upsert: true
    });

    if (!lock['value']) {
      throw new Error(`Attempted to unlock permissions that were not locked!`);
    }
  }



  /**
   *  Given a tyranid document <doc>, update its permissions based on doc.permissions
   */
  static async updatePermissions(resourceDocument: Tyr.Document): Promise<Tyr.Document> {

    if (!resourceDocument) {
      throw new TypeError(`called PermissionsModel.updatePermissions() on undefined`);
    }

    PermissionsModel.validateAsResource(resourceDocument.$model);

    const permissions         = <gracl.Permission[]> _.get(resourceDocument, 'permissions', []),
          existingPermissions = <gracl.Permission[]> [],
          newPermissions      = <gracl.Permission[]> [],
          updated             = <Tyr.Document[]> [],
          permIdField         = PermissionsModel.def.primaryKey.field;


    // lock permission for this resource
    await PermissionsModel.lockPermissionsForResource(resourceDocument);

    const resourceCollectionName = resourceDocument.$model.def.name;

    const subjectIds = <string[]> _.chain(permissions)
      .map('subjectId')
      .compact()
      .value();

    /**
     *  Determine which subjects actually exist in database,
        helps curtail "zombie" permissions that may accumulate due to update/delete
        race condition.
     */
    const existingSubjects: Tyr.Document[] = await Tyr.byUids(subjectIds, { tyranid: { insecure: true } });

    const existingSubjectIdsFromPermissions = _.reduce(
      existingSubjects,
      (out, entity) => {
        out.add(entity.$uid);
        return out;
      },
      new Set<string>()
    );

    const uniquenessCheck = new Set();

    // validate + partition
    _.chain(permissions)
      .filter(perm => {
        return (perm.subjectId && existingSubjectIdsFromPermissions.has(perm.subjectId));
      })
      .each(perm => {
      if (!perm.resourceId) throw new Error(`Tried to add permission for ${resourceDocument.$uid} without resourceId!`);

      const hash = `${perm.resourceId}-${perm.subjectId}`;

      if (uniquenessCheck.has(hash)) {
        throw new Error(
          `Attempted to set duplicate permission for combination of ` +
          `resource = ${perm.resourceId}, subject = ${perm.subjectId}`
        );
      }

      uniquenessCheck.add(hash);

      if (perm[permIdField]) {
        existingPermissions.push(perm);
      } else {
        newPermissions.push(perm);
      }
    })
    .value();


    const existingUpdatePromises = existingPermissions.map(perm => {
      return PermissionsModel.findAndModify({
        query: { [permIdField]: perm[permIdField] },
        update: { $set: perm },
        new: true
      });
    });

    const newPermissionPromises = newPermissions.map(perm => {
      return PermissionsModel.fromClient(perm).$save();
    });

    updated.push(...(await Promise.all(existingUpdatePromises)));
    updated.push(...(await Promise.all(newPermissionPromises)));

    // extract all the ids from the updated permissions
    resourceDocument['permissionIds'] = _.map(updated, permIdField);

    // remove permissions for this resource that are not in the given ids
    await PermissionsModel.remove({
      [permIdField]: { $nin: resourceDocument['permissionIds'] },
      resourceId: resourceDocument.$uid
    });

    const updatedResourceDocument = await resourceDocument.$save();

    const populated = <Tyr.Document> (
      await Tyr.byName[resourceCollectionName]
        .populate('permissionIds', updatedResourceDocument)
    );

    // unlock permissions before returning
    await PermissionsModel.unlockPermissionsForResource(resourceDocument);

    return populated;
  }


  /**
   *  Given a uid, remove all permissions relating to that entity in the system
   */
  static async deletePermissions(doc: Tyr.Document): Promise<Tyr.Document> {
    const uid = doc.$uid;

    if (!uid) {
      throw new Error('No $uid property on document!');
    }

    await PermissionsModel.lockPermissionsForResource(doc);

    /**
     * Get all permissions relevant to this uid
     */
    const permissions = await PermissionsModel.find({
      $or: [
        { subjectId: uid },
        { resourceId: uid }
      ]
    }, null, { tyranid: { insecure: true } });

    const permissionsByCollection = new Map<string, string[]>();

    _.each(permissions, perm => {
      const altUid = perm['subjectId'] === uid
        ? perm['resourceId']
        : perm['subjectId'];

      const parsed = Tyr.parseUid(altUid),
            collectionName = parsed.collection.def.name;

      if (!permissionsByCollection.has(collectionName)) {
        permissionsByCollection.set(collectionName, []);
      }

      permissionsByCollection.get(collectionName).push(perm.$id);
    });

    for (const [collectionName, idList] of permissionsByCollection) {
      // pull all permissions ids out of documents in this collection
      // that relate to the resourceDocument
      await Tyr.byName[collectionName].update(
        {},
        {
          $pull: {
            permissionIds: {
              $in: idList
            }
          }
        },
        { multi: true }
      );
    }

    delete doc['permissions'];
    doc['permissionIds'] = [];
    await doc.$save();

    await PermissionsModel.unlockPermissionsForResource(doc);

    return doc;
  }


}
