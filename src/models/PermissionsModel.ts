import * as _ from 'lodash';
import { Tyr } from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
import { permissionExplaination, Hash } from '../interfaces';

import { createResource } from '../graph/createResource';
import { createSubject } from '../graph/createSubject';
import { getGraclClasses } from '../graph/getGraclClasses';
import { validateAsResource } from '../graph/validateAsResource';
import { getObjectHierarchy } from '../graph/getObjectHierarchy';
import { findLinkInCollection } from '../graph/findLinkInCollection';

import { validatePermissionExists } from '../permission/validatePermissionExists';
import { parsePermissionString } from '../permission/parsePermissionString';
import { getPermissionParents } from '../permission/getPermissionParents';
import { formatPermissionType } from '../permission/formatPermissionType';
import { isCrudPermission } from '../permission/isCrudPermission';

import { extractIdAndModel } from '../tyranid/extractIdAndModel';

/**
 * The main model for storing individual permission edges
 */
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

async function resolveSubjectAndResourceDocuments(
  resourceData: Tyr.Document | string,
  subjectData: Tyr.Document | string
) {
  const resourceDocument =
    typeof resourceData === 'string'
      ? await Tyr.byUid(resourceData)
      : resourceData;

  if (!resourceDocument)
    throw new Error(
      `No resourceDocument resolvable given: ${JSON.stringify(resourceData)}`
    );

  const subjectDocument =
    typeof subjectData === 'string'
      ? await Tyr.byUid(subjectData)
      : subjectData;

  if (!subjectDocument)
    throw new Error(
      `No subjectDocument resolvable given: ${JSON.stringify(subjectData)}`
    );

  return {
    resourceDocument,
    subjectDocument
  };
}

/**
  Collection to contain all permissions used by gracl
 */
export class PermissionsModel extends PermissionsBaseCollection {
  // error-checked method for retrieving the plugin instance attached to tyranid
  static getGraclPlugin(): GraclPlugin {
    const plugin = <GraclPlugin | undefined>Tyr.secure;
    if (!plugin) {
      return GraclPlugin.prototype.error(
        `No gracl plugin available, must instantiate GraclPlugin and pass to Tyr.config()!`
      );
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
      resourceId: direct
        ? resourceDocument.$uid
        : {
            $in: await resource.getHierarchyIds()
          }
    };

    if (permissionType) {
      query[`access.${permissionType}`] = {
        $exists: true
      };
    }

    return PermissionsModel.findAll({ query });
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
      subjectId: direct
        ? subjectDocument.$uid
        : {
            $in: await subject.getHierarchyIds()
          }
    };

    if (permissionType) {
      query[`access.${permissionType}`] = {
        $exists: true
      };
    }

    return PermissionsModel.findAll({ query });
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
    return this.determineAccess(resourceData, permissionType, subjectData).then(
      result => result[permissionType]
    );
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
    const permissionTypes =
      typeof permissionsToCheck === 'string'
        ? [permissionsToCheck]
        : permissionsToCheck;

    extractIdAndModel(plugin, resourceData);
    extractIdAndModel(plugin, subjectData);

    let {
      resourceDocument,
      subjectDocument
    } = await resolveSubjectAndResourceDocuments(resourceData, subjectData);

    const { subject, resource } = getGraclClasses(
        plugin,
        resourceDocument,
        subjectDocument
      ),
      permHierarchyCache: Hash<string[]> = {};

    const allPermsToCheck = <string[]>_.chain(permissionTypes)
      .map(perm => {
        return (permHierarchyCache[perm] = [
          perm,
          ...getPermissionParents(plugin, perm)
        ]);
      })
      .flatten()
      .uniq()
      .compact()
      .value();

    // recurse up subject / resource hierarchy checking all permissions
    const permCheckResults = await resource.determineAccess(
      subject,
      allPermsToCheck
    );

    _.each(permissionTypes, perm => {
      accessResults[perm] = _.some(
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

    let {
      resourceDocument,
      subjectDocument
    } = await resolveSubjectAndResourceDocuments(resourceData, subjectData);

    const { subject, resource } = getGraclClasses(
      plugin,
      resourceDocument,
      subjectDocument
    );

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
      if (permissionType) {
        validatePermissionExists(plugin, permissionType);
        $set[`access.${permissionType}`] = access;
      }
    });

    if (!resourceDocument)
      throw new TypeError(`no resource given to updatePermissions`);
    if (!subjectDocument)
      throw new TypeError(`no subject given to updatePermissions`);

    const resourceComponents = extractIdAndModel(plugin, resourceDocument),
      subjectComponents = extractIdAndModel(plugin, subjectDocument);

    validateAsResource(plugin, resourceComponents.$model);

    // set the permission
    try {
      await PermissionsModel.db.findOneAndUpdate(
        {
          subjectId: subjectComponents.$uid,
          resourceId: resourceComponents.$uid
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
        return <Tyr.Document>await new Promise<Tyr.Document | null>(
          (resolve, reject) => {
            setTimeout(() => {
              PermissionsModel.updatePermissions(
                resourceDocument,
                permissionChanges,
                subjectDocument,
                attempt++
              )
                .then(resolve)
                .catch(reject);
            }, 100);
          }
        );
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
      query: {
        $or: [{ subjectId: uid }, { resourceId: uid }]
      }
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
        subjectType: 1
      },
      { unique: false }
    );
  }

  static async findEntitiesWithPermissionAccessToResource(
    accessType: 'allow' | 'deny',
    permissions: string[],
    doc: Tyr.Document
  ) {
    const plugin = PermissionsModel.getGraclPlugin();
    validateAsResource(plugin, doc.$model);

    if (!permissions.length) {
      plugin.error(
        `No permissions provided to findEntitiesWithPermissionAccessToResource()!`
      );
    }

    /**
     * Get hierarchy of permissions stemming from provided list
     */
    const permHierarchy = permissions.map(p => {
      const components = parsePermissionString(plugin, p);

      const formatted = formatPermissionType(plugin, {
        action: components.action,
        collection:
          components.collection ||
          (isCrudPermission(plugin, p) && doc.$model.def.name) ||
          undefined
      });

      validatePermissionExists(plugin, formatted);

      return [formatted, ...getPermissionParents(plugin, formatted)];
    });

    const permissionsAsResource = await plugin.permissionsModel.findAll({
      query: {
        $and: [
          // for the given resource...
          { resourceId: doc.$uid },
          // get any permission docs with any of the possible permTypes
          {
            $or: permHierarchy.map(list => ({
              $or: list.map(permission => ({
                [`access.${permission}`]: { $exists: true }
              }))
            }))
          }
        ]
      }
    });

    // get all subjects with direct permissions set for this resource,
    // does not yet include _all_ subjects down the heirarchy
    const subjectDocuments = await Tyr.byUids(
      <string[]>permissionsAsResource.map((p: any) => p['subjectId'])
    );

    const subjectsByCollection: Hash<Tyr.Document[]> = {};
    _.each(subjectDocuments, subject => {
      const colName = subject.$model.def.name;
      if (!subjectsByCollection[colName]) subjectsByCollection[colName] = [];
      subjectsByCollection[colName].push(subject);
    });

    const permsBySubjectId: Hash<Tyr.Document> = {};
    _.each(permissionsAsResource, (permObj: any) => {
      permsBySubjectId[permObj['subjectId']] = permObj;
    });

    // test if a given subject satisfies all required permissions
    const accessCache: Hash<boolean> = {};
    function filterAccess(subject: Tyr.Document, explicit = false) {
      const uid = subject.$uid;
      const hashKey = `${uid}-${explicit}`;

      if (hashKey in accessCache) return accessCache[hashKey];

      const perm = permsBySubjectId[uid] || { access: {} };

      return (accessCache[hashKey] = _.every(permHierarchy, list => {
        // check for explicit denies
        if (explicit) {
          const access = accessType === 'allow' ? false : true;
          return _.every(list, p => _.get(perm, `access.${p}`) !== access);
        } else {
          const access = accessType === 'allow' ? true : false;
          return _.some(list, p => _.get(perm, `access.${p}`) === access);
        }
      }));
    }

    async function traverse(
      hierarchy: any,
      parentCollectionNames: string[] = []
    ) {
      const collections = Object.keys(hierarchy);

      await Promise.all(
        _.map(collections, async collectionName => {
          const subjects = (subjectsByCollection[
            collectionName
          ] = _.filter(subjectsByCollection[collectionName], s =>
            filterAccess(s)
          ));

          const query: Tyr.MongoQuery = {
            $and: [{ _id: { $nin: _.map(subjects, '$id') } }]
          };

          // get link from child collection to parent collection
          if (parentCollectionNames.length) {
            const $or: Tyr.MongoQuery[] = [];

            for (const parentCollectionName of _.compact(
              parentCollectionNames
            )) {
              const parentSubjects = subjectsByCollection[parentCollectionName],
                parentSubjectIds = _.map(parentSubjects, '$id');

              const link = findLinkInCollection(
                plugin,
                Tyr.byName[collectionName],
                Tyr.byName[parentCollectionName]
              );

              if (link) {
                $or.push({
                  [link.spath]: {
                    $in: parentSubjectIds
                  }
                });
              }
            }

            query['$and'].push({ $or });

            // get all matching docs to query
            const inheritedSubjects = await Tyr.byName[collectionName].findAll({
              query
            });

            // filter out subjects which have an explicit deny/allow on any
            // of the required permissions
            const filteredDeniedSubjects = _.filter(
              inheritedSubjects,
              subject => filterAccess(subject, true)
            );

            subjectsByCollection[collectionName].push(
              ...filteredDeniedSubjects
            );
          }

          await traverse(hierarchy[collectionName], [
            collectionName,
            ...parentCollectionNames
          ]);
        })
      );
    }

    await traverse(getObjectHierarchy(plugin).subjects);

    return <Tyr.Document[]>_(subjectsByCollection)
      .values()
      .flatten()
      .uniqBy('$uid')
      .compact()
      .value();
  }
}
