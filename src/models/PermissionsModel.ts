/// <reference path='../../typings/main.d.ts' />
import * as _ from 'lodash';
import Tyr from 'tyranid';
import * as gracl from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
import { permissionExplaination, Hash } from '../interfaces';

import { createResource } from '../graph/createResource';
import { createSubject } from '../graph/createSubject';
import { getGraclClasses } from '../graph/getGraclClasses';
import { validateAsResource } from '../graph/validateAsResource';

import { validatePermissionExists } from '../permission/validatePermissionExists';
import { parsePermissionString } from '../permission/parsePermissionString';
import { nextPermissions } from '../permission/nextPermissions';
import { getPermissionParents } from '../permission/getPermissionParents';

import { extractIdAndModel } from '../tyranid/extractIdAndModel';


/**
 * The main model for storing individual permission edges
 */
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


  // error-checked method for retrieving the plugin instance attached to tyranid
  static getGraclPlugin(): GraclPlugin {
    const plugin = <GraclPlugin> Tyr.secure;
    if (!plugin) {
      plugin.error(`No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!`);
    }
    return plugin;
  }


  /**
   * For a given resource document, find all permission edges
   * that have it as the resource. Optionally return only direct (non inherited)
   * permission objects
   */
  static async getPermissionsOfTypeForResource(
    resourceDocument: Tyr.Document,
    permissionType?: string,
    direct?: boolean
  ) {

    const plugin = PermissionsModel.getGraclPlugin(),
          resource = createResource(plugin, resourceDocument);

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


  /**
   * For a given subject document, find all permission edges
   * that have it as the subject. Optionally return only direct (non inherited)
   * permission objects
   */
  static async getPermissionsOfTypeForSubject(
    subjectDocument: Tyr.Document,
    permissionType?: string,
    direct?: boolean
  ) {
    const plugin = PermissionsModel.getGraclPlugin(),
          subject = createSubject(plugin, subjectDocument);

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


  /**
   * check if a subject document has positive access
   * to a given resource document for a particular permission
   *
   * uses the methods within the separate `gracl` library's Resource class
   * (see: https://github.com/CrossLead/gracl/blob/master/lib/classes/Resource.ts)
   * and Subject class (https://github.com/CrossLead/gracl/blob/master/lib/classes/Subject.ts)
   */
  static isAllowed(
    resourceData: Tyr.Document | string,
    permissionType: string,
    subjectData: Tyr.Document | string
  ): Promise<boolean> {
    return this.determineAccess(resourceData, permissionType, subjectData)
      .then(result => result[permissionType]);
  }



  /**
   * Determine access to multiple permissions simultaneously
   */
  static async determineAccess(
    resourceData: Tyr.Document | string,
    permissionsToCheck: string | string[],
    subjectData: Tyr.Document | string
  ): Promise<Hash<boolean>> {
    const accessResults: Hash<boolean> = {};
    const plugin = PermissionsModel.getGraclPlugin();
    const permissionTypes = typeof permissionsToCheck === 'string'
      ? [ permissionsToCheck ]
      : permissionsToCheck;

    extractIdAndModel(plugin, resourceData);
    extractIdAndModel(plugin, subjectData);

    let resourceDocument = typeof resourceData === 'string'
      ? await Tyr.byUid(resourceData)
      : resourceData;

    let subjectDocument = typeof subjectData === 'string'
      ? await Tyr.byUid(subjectData)
      : subjectData;

    const {
            subject,
            resource
          } = getGraclClasses(plugin, resourceDocument, subjectDocument),
          permHierarchyCache: Hash<string[]> = {};

    const allPermsToCheck = <string[]> _.chain(permissionTypes)
      .map(perm => {
        return permHierarchyCache[perm] = [ perm, ...getPermissionParents(plugin, perm) ];
      })
      .flatten()
      .unique()
      .compact()
      .value();

    // recurse up subject / resource hierarchy checking all permissions
    const permCheckResults = await resource.determineAccess(subject, allPermsToCheck);

    _.each(permissionTypes, perm => {
      accessResults[perm] = _.any(
        permHierarchyCache[perm],
        p => permCheckResults[p].access
      );
    });

    return accessResults;
  }



  /**
   * Explain why a subject has or does not have access to a resource
   * for a given permission
   *
   * uses the methods within the separate `gracl` library's Resource class
   * (see: https://github.com/CrossLead/gracl/blob/master/lib/classes/Resource.ts)
   * and Subject class (https://github.com/CrossLead/gracl/blob/master/lib/classes/Subject.ts)
   */
  static async explainPermission(
    resourceData: Tyr.Document | string,
    permissionType: string,
    subjectData: Tyr.Document | string
  ): Promise<permissionExplaination> {
    const plugin = PermissionsModel.getGraclPlugin();
    validatePermissionExists(plugin, permissionType);

    extractIdAndModel(plugin, resourceData);
    extractIdAndModel(plugin, subjectData);

    let resourceDocument = typeof resourceData === 'string'
      ? await Tyr.byUid(resourceData)
      : resourceData;

    let subjectDocument = typeof subjectData === 'string'
      ? await Tyr.byUid(subjectData)
      : subjectData;

    const { subject, resource } = getGraclClasses(plugin, resourceDocument, subjectDocument);

    const permObj = await resource.determineAccess(subject, permissionType);
    return permObj[permissionType];
  }


  /**
   * Create/update a permission edge document to
   * set a permission between a given resource and subject
   */
  static async updatePermissions(
    resourceDocument: Tyr.Document | string,
    permissionChanges: { [key: string]: boolean },
    subjectDocument: Tyr.Document | string,
    attempt = 0
  ) {
    const plugin = PermissionsModel.getGraclPlugin();

    const $set: { [key: string]: boolean } = {};

    _.each(permissionChanges, (access, permissionType) => {
      validatePermissionExists(plugin, permissionType);
      $set[`access.${permissionType}`] = access;
    });

    if (!resourceDocument) throw new TypeError(`no resource given to updatePermissions`);
    if (!subjectDocument) throw new TypeError(`no subject given to updatePermissions`);

    const resourceComponents = extractIdAndModel(plugin, resourceDocument),
          subjectComponents = extractIdAndModel(plugin, subjectDocument);

    validateAsResource(plugin, resourceComponents.$model);

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
          $set
        },
        { upsert: true }
      );
    } catch (error) {
      // hack for https://jira.mongodb.org/browse/SERVER-14322
      if (attempt < 10 && /E11000 duplicate key error/.test(error.message)) {
        return <Tyr.Document> (await new Promise((resolve, reject) => {
          setTimeout(() => {
            PermissionsModel
              .updatePermissions(
                resourceDocument,
                permissionChanges,
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
      return Tyr.byUid(resourceDocument);
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


  // create mongodb indexes for the permission edges
  static async createIndexes() {
    const plugin = PermissionsModel.getGraclPlugin();

    plugin.log(`Creating indexes...`);

    await PermissionsModel.db.createIndex(
      {
        subjectId: 1,
        resourceId: 1
      },
      { unique: true }
    );

    await PermissionsModel.db.createIndex(
      {
        resourceType: 1,
        subjectType: 1,
      },
      { unique: false }
    );

  }


}