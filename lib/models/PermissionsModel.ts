/// <reference path='../../typings/main.d.ts' />
import * as _ from 'lodash';
import Tyr from 'tyranid';
import * as gracl from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';


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
      throw new Error(`No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!`);
    }
    return plugin;
  }



  static validatePermissionType(permissionType: string, queriedCollection: Tyr.CollectionInstance) {

    const plugin = PermissionsModel.getGraclPlugin(),
          components = plugin.parsePermissionString(permissionType);


    if (!plugin.getPermissionObject(permissionType)) {
      throw new Error(
        `Invalid permissionType ${permissionType}! ` +
        `permission action given ("${components.action}") is not valid. Must be one of (${
          _.keys(plugin.permissionHierarchy).join(', ')
        })`
      );
    }

    // if given collection name, validate it
    if (components.collection) {
      const permissionCollection = Tyr.byName[components.collection];
      if (!permissionCollection) {
        throw new Error(`No collection ${components.collection}, permission ` +
          `of type <action>-<collection> must contain valid collection!`);
      }

      PermissionsModel.validateAsResource(permissionCollection);
      PermissionsModel.validateAsResource(queriedCollection);

      const queriedResourceHierarchy = plugin
        .graclHierarchy
        .getResource(queriedCollection.def.name)
        .getHierarchyClassNames();

      const permissionResourceHierarchy = plugin
        .graclHierarchy
        .getResource(components.collection)
        .getHierarchyClassNames();

      if (!(
            _.contains(permissionResourceHierarchy, queriedCollection.def.name) ||
            _.contains(queriedResourceHierarchy, components.collection)
          )) {
        throw new Error(
          `Cannot set permission "${permissionType}" on collection ` +
          `"${components.collection}" as resource, as collection "${queriedCollection.def.name}" ` +
          `does not exist in the resource hierarchy of "${components.collection}"`
        );
      }
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
    if (!(subjectDocument && subjectDocument.$uid)) {
      throw new Error('No subject document provided (or Tyr.local.user is unavailable)!');
    }

    const plugin = PermissionsModel.getGraclPlugin(),
          subjectCollectionName  = subjectDocument.$model.def.name,
          SubjectClass           = plugin.graclHierarchy.getSubject(subjectCollectionName);

    if (!SubjectClass) {
      throw new Error(
        `Attempted to set/get permission using ${subjectCollectionName} as subject, ` +
        `no relevant subject class found in tyranid-gracl plugin!`
      );
    }

    return new SubjectClass(subjectDocument);
  }


  static createResource(resourceDocument: Tyr.Document): gracl.Resource {
    if (!(resourceDocument && resourceDocument.$uid)) {
      throw new Error('No resource document provided (or Tyr.local.user is unavailable)!');
    }

    const plugin = PermissionsModel.getGraclPlugin(),
          resourceCollectionName  = resourceDocument.$model.def.name,
          ResourceClass           = plugin.graclHierarchy.getResource(resourceCollectionName);

    if (!ResourceClass) {
      throw new Error(
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
    if (permissionType) PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);
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
      resourceDocument: Tyr.Document,
      permissionType: string,
      subjectDocument = Tyr.local.user
    ): Promise<boolean> {
    PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);

    const plugin = PermissionsModel.getGraclPlugin();

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
      resourceDocument: Tyr.Document,
      permissionType: string,
      subjectDocument = Tyr.local.user
    ): Promise<{ type: string, access: boolean, reason: string }> {
    PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);

    const { subject, resource } = await PermissionsModel.getGraclClasses(resourceDocument, subjectDocument);

    return await resource.determineAccess(subject, permissionType);
  }



  static async setPermissionAccess(
          resourceDocument: Tyr.Document,
          permissionType: string,
          access: boolean,
          subjectDocument = Tyr.local.user
        ): Promise<Tyr.Document> {
    if (!resourceDocument) throw new TypeError(`called PermissionsModel.setPermission() without resourceDocument`);
    if (!resourceDocument.$uid) throw new TypeError(`resource document must be a Tyranid document with $uid`);
    if (!subjectDocument) throw new TypeError(`called PermissionsModel.setPermission() without subjectDocument`);
    if (!subjectDocument.$uid) throw new TypeError(`subject document must be a Tyranid document with $uid`);

    PermissionsModel.validateAsResource(resourceDocument.$model);
    PermissionsModel.validatePermissionType(permissionType, resourceDocument.$model);

    // set the permission
    await PermissionsModel.findAndModify({
      query: {
        subjectId: subjectDocument.$uid,
        resourceId: resourceDocument.$uid
      },
      update: {
        $set: {
          subjectId: subjectDocument.$uid,
          resourceId: resourceDocument.$uid,
          subjectType: subjectDocument.$model.def.name,
          resourceType: resourceDocument.$model.def.name,
          [`access.${permissionType}`]: access
        }
      },
      upsert: true
    });

    return PermissionsModel.populatePermissions(resourceDocument);
  }




  static async populatePermissions(resourceDocument: Tyr.Document): Promise<Tyr.Document> {
    const plugin = PermissionsModel.getGraclPlugin();
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

    if (!uid) throw new Error('No $uid property on document!');

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
