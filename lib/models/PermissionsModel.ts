/// <reference path='../../typings/main.d.ts' />
import * as _ from 'lodash';
import Tyr from 'tyranid';
import * as gracl from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
import { permissionExplaination } from '../interfaces';


export const PermissionsBaseCollection = <Tyr.CollectionInstance> new Tyr.Collection({
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
 */
export class PermissionsModel extends (<Tyr.CollectionInstance> PermissionsBaseCollection) {


  static getGraclPlugin(): GraclPlugin {
    const plugin = <GraclPlugin> Tyr.secure;
    if (!plugin) {
      plugin.error(`No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!`);
    }
    return plugin;
  }


  static async getPermissionsOfTypeForResource(
    resourceDocument: Tyr.Document,
    permissionType?: string,
    direct?: boolean
  ) {

    const plugin = PermissionsModel.getGraclPlugin(),
          resource = plugin.createResource(resourceDocument);

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
    const plugin = PermissionsModel.getGraclPlugin(),
          subject = plugin.createSubject(subjectDocument);

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

    const {
            subject,
            resource
          } = plugin.getGraclClasses(resourceDocument, subjectDocument),
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
  ): Promise<permissionExplaination> {
    const plugin = PermissionsModel.getGraclPlugin();
    plugin.validatePermissionExists(permissionType);

    let resourceDocument = typeof resourceData === 'string'
      ? await Tyr.byUid(resourceData)
      : resourceData;

    let subjectDocument = typeof subjectData === 'string'
      ? await Tyr.byUid(subjectData)
      : subjectData;

    const { subject, resource } = plugin.getGraclClasses(resourceDocument, subjectDocument);

    return await resource.determineAccess(subject, permissionType);
  }


  static async setPermissionAccess(
    resourceDocument: Tyr.Document | string,
    permissionType: string,
    access: boolean,
    subjectDocument: Tyr.Document | string,
    attempt = 0
  ): Promise<Tyr.Document> {
    const plugin = PermissionsModel.getGraclPlugin();
    plugin.validatePermissionExists(permissionType);

    if (!resourceDocument) throw new TypeError(`no resource given to setPermissionAccess`);
    if (!subjectDocument) throw new TypeError(`no subject given to setPermissionAccess`);

    const resourceComponents = plugin.extractIdAndModel(resourceDocument),
          subjectComponents = plugin.extractIdAndModel(subjectDocument);

    plugin.validateAsResource(resourceComponents.$model);

    // set the permission
    try {
      await PermissionsModel.db.findOneAndUpdate(
        {
          subjectId: subjectComponents.$uid,
          resourceId: resourceComponents.$uid,
        },
        {
          $setOnInsert: {
            subjectId: subjectComponents.$uid,
            resourceId: resourceComponents.$uid,
            subjectType: subjectComponents.$model.def.name,
            resourceType: resourceComponents.$model.def.name
          },
          $set: {
            [`access.${permissionType}`]: access
          }
        },
        { upsert: true }
      );
    } catch (error) {
      // hack for https://jira.mongodb.org/browse/SERVER-14322
      if (attempt < 10 && /E11000 duplicate key error/.test(error.message)) {
        return <Tyr.Document> (await new Promise((resolve, reject) => {
          setTimeout(() => {
            PermissionsModel.setPermissionAccess(
              resourceDocument,
              permissionType,
              access,
              subjectDocument,
              attempt++
            )
            .then(resolve)
            .catch(reject);
          }, 100);
        }));
      } else if (/E11000 duplicate key error/.test(error.message)) {
        plugin.error(
          `Attempted to update permission 10 times, but recieved "E11000 duplicate key error" on each attempt`
        );
      }
      throw new Error(error);
    }


    if (typeof resourceDocument === 'string') {
      const doc = await Tyr.byUid(resourceDocument);
      return doc;
    } else {
      return resourceDocument;
    }
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

    return doc;
  }



}
