/// <reference path='../../typings/main.d.ts' />
import * as _ from 'lodash';
import Tyr from 'tyranid';
import * as gracl from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
import { extractIdAndModel } from '../utilities/';


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


  static getGraclPlugin(): GraclPlugin {
    const plugin = <GraclPlugin> Tyr.secure;
    if (!plugin) {
      plugin.error(`No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!`);
    }
    return plugin;
  }


  static validateAsResource(collection: Tyr.CollectionInstance) {
    const plugin = PermissionsModel.getGraclPlugin();

    if (!collection) {
      plugin.error(`Attempted to validate undefined collection!`);
    }

    if (!plugin.graclHierarchy.resources.has(collection.def.name)) {
      plugin.error(
        `Attempted to set/get permission using ${collection.def.name} as resource, ` +
        `no relevant resource class found in tyranid-gracl plugin!`
      );
    }
  }



  static async getGraclClasses(
                resourceDocument: Tyr.Document,
                subjectDocument: Tyr.Document
              ): Promise<{ subject: gracl.Subject, resource: gracl.Resource }> {


    const plugin = PermissionsModel.getGraclPlugin(),
          resourceCollectionName = resourceDocument.$model.def.name;

    if (!resourceDocument[plugin.permissionsProperty]) {
      resourceDocument = await PermissionsModel.populatePermissions(resourceDocument);
    }

    const subject  = PermissionsModel.createSubject(subjectDocument),
          resource = PermissionsModel.createResource(resourceDocument);

    return { subject, resource };
  }


  static createSubject(subjectDocument: Tyr.Document): gracl.Subject {
    const plugin = PermissionsModel.getGraclPlugin();

    if (!(subjectDocument && subjectDocument.$uid)) {
      plugin.error('No subject document provided (or Tyr.local.user is unavailable)!');
    }

    const subjectCollectionName  = subjectDocument.$model.def.name,
          SubjectClass           = plugin.graclHierarchy.getSubject(subjectCollectionName);

    if (!SubjectClass) {
      plugin.error(
        `Attempted to set/get permission using ${subjectCollectionName} as subject, ` +
        `no relevant subject class found in tyranid-gracl plugin!`
      );
    }

    return new SubjectClass(subjectDocument);
  }


  static createResource(resourceDocument: Tyr.Document): gracl.Resource {
    const plugin = PermissionsModel.getGraclPlugin();

    if (!(resourceDocument && resourceDocument.$uid)) {
      plugin.error('No resource document provided (or Tyr.local.user is unavailable)!');
    }

    const resourceCollectionName  = resourceDocument.$model.def.name,
          ResourceClass           = plugin.graclHierarchy.getResource(resourceCollectionName);

    if (!ResourceClass) {
      plugin.error(
        `Attempted to set/get permission using ${resourceCollectionName} as resource, ` +
        `no relevant resource class found in tyranid-gracl plugin!`
      );
    }

    return new ResourceClass(resourceDocument);
  }


  static async getPermissionsOfTypeForResource(
            resourceDocument: Tyr.Document,
            permissionType?: string,
            direct?: boolean
          ) {
    const resource = PermissionsModel.createResource(resourceDocument);

    const query: { [key: string]: any } = {
      resourceId: (direct ? resourceDocument.$uid : {
        $in: await resource.getHierarchyIds()
      })
    };

    if (permissionType) {
      query[`access.${permissionType}`] = {
        $exists: true
      };
    }

    return PermissionsModel.findAll(query);
  }



  static async getPermissionsOfTypeForSubject(
            subjectDocument: Tyr.Document,
            permissionType?: string,
            direct?: boolean
          ) {

    const subject = PermissionsModel.createSubject(subjectDocument);

    const query: { [key: string]: any } = {
      subjectId: (direct ? subjectDocument.$uid : {
        $in: await subject.getHierarchyIds()
      })
    };

    if (permissionType) {
      query[`access.${permissionType}`] = {
        $exists: true
      };
    }

    return PermissionsModel.findAll(query);
  }



  static async isAllowed(
      resourceData: Tyr.Document | string,
      permissionType: string,
      subjectData: Tyr.Document | string
    ): Promise<boolean> {

    const plugin = PermissionsModel.getGraclPlugin();

    let resourceDocument = typeof resourceData === 'string'
      ? await Tyr.byUid(resourceData)
      : resourceData;

    let subjectDocument = typeof subjectData === 'string'
      ? await Tyr.byUid(subjectData)
      : subjectData;

    if (!resourceDocument[plugin.permissionsProperty]) {
      resourceDocument = await PermissionsModel.populatePermissions(resourceDocument);
    }

    const {
            subject,
            resource
          } = await PermissionsModel.getGraclClasses(resourceDocument, subjectDocument),
          components = plugin.parsePermissionString(permissionType),
          nextPermissions = plugin.nextPermissions(permissionType),
          access = await resource.isAllowed(subject, permissionType);

    if (!access && nextPermissions) {
      for (const nextPermission of nextPermissions) {

        const parentAccess = await PermissionsModel
          .isAllowed(resourceDocument, nextPermission, subjectDocument);

        if (parentAccess) return true;
      }
    }

    return access;
  }


  static async explainPermission(
      resourceData: Tyr.Document | string,
      permissionType: string,
      subjectData: Tyr.Document | string
    ): Promise<{ type: string, access: boolean, reason: string }> {
    const plugin = PermissionsModel.getGraclPlugin();
    plugin.validatePermissionExists(permissionType);

    let resourceDocument = typeof resourceData === 'string'
      ? await Tyr.byUid(resourceData)
      : resourceData;

    let subjectDocument = typeof subjectData === 'string'
      ? await Tyr.byUid(subjectData)
      : subjectData;

    if (!resourceDocument[plugin.permissionsProperty]) {
      resourceDocument = await PermissionsModel.populatePermissions(resourceDocument);
    }

    const { subject, resource } = await PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);

    return await resource.determineAccess(subject, permissionType);
  }


  static async setPermissionAccess(
          resourceDocument: Tyr.Document | string,
          permissionType: string,
          access: boolean,
          subjectDocument: Tyr.Document | string
        ): Promise<Tyr.Document> {
    const plugin = PermissionsModel.getGraclPlugin();
    plugin.validatePermissionExists(permissionType);

    if (!resourceDocument) throw new TypeError(`no resource given to setPermissionAccess`);
    if (!subjectDocument) throw new TypeError(`no subject given to setPermissionAccess`);

    const resourceComponents = extractIdAndModel(resourceDocument),
          subjectComponents = extractIdAndModel(subjectDocument);

    PermissionsModel.validateAsResource(resourceComponents.$model);

    // set the permission
    await PermissionsModel.findAndModify({
      query: {
        subjectId: subjectComponents.$uid,
        resourceId: resourceComponents.$uid,
      },
      update: {
        $set: {
          subjectId: subjectComponents.$uid,
          resourceId: resourceComponents.$uid,
          subjectType: subjectComponents.$model.def.name,
          resourceType: resourceComponents.$model.def.name,
          [`access.${permissionType}`]: access
        }
      },
      upsert: true
    });

    if (typeof resourceDocument === 'string') {
      const doc = await Tyr.byUid(resourceDocument);
      return PermissionsModel.populatePermissions(doc);
    } else {
      return PermissionsModel.populatePermissions(resourceDocument);
    }
  }



  static async populatePermissions(resourceDocument: Tyr.Document): Promise<Tyr.Document> {
    const plugin = PermissionsModel.getGraclPlugin();

    PermissionsModel.validateAsResource(resourceDocument.$model);

    resourceDocument[plugin.permissionsProperty] = await PermissionsModel.findAll({
      resourceId: resourceDocument.$uid
    });
    return resourceDocument;
  }



  /**
   *  Given a uid, remove all permissions relating to that entity in the system
   */
  static async deletePermissions(doc: Tyr.Document): Promise<Tyr.Document> {
    const uid = doc.$uid,
          plugin = PermissionsModel.getGraclPlugin();

    if (!uid) plugin.error('No $uid property on document!');

    await PermissionsModel.remove({
      $or: [
        { subjectId: uid },
        { resourceId: uid }
      ]
    });

    delete doc[plugin.permissionsProperty];

    return doc;
  }



}
