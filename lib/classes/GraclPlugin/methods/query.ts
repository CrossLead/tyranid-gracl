import Tyr from 'tyranid';
import * as _ from 'lodash';
import { Permission, baseCompare } from 'gracl';
import { GraclPlugin } from '../';
import { PermissionsModel } from '../../../models/PermissionsModel';
import { Hash } from '../../../interfaces';



/**
 *  Method for creating a specific query based on a schema object
 */
export async function query(
  queriedCollection: Tyr.CollectionInstance,
  permissionType: string,
  subjectDocument = Tyr.local.user
): Promise<boolean | {}> {

  const queriedCollectionName = queriedCollection.def.name,
        plugin = <GraclPlugin> this;

  if (plugin.unsecuredCollections.has(queriedCollectionName)) {
    plugin.log(`skipping query modification for ${queriedCollectionName} as it is flagged as unsecured`);
    return {};
  }

  if (!permissionType) {
    plugin.error(`No permissionType given to GraclPlugin.query()`);
  }

  if (!plugin.graclHierarchy) {
    plugin.error(`Must call GraclPlugin.boot() before using GraclPlugin.query()`);
  }

  const components = plugin.parsePermissionString(permissionType);

  permissionType = plugin.formatPermissionType({
    action: components.action,
    collection: components.collection || queriedCollectionName
  });

  // if no subjectDocument, no restriction...
  if (!subjectDocument) {
    plugin.log(`No subjectDocument passed to GraclPlugin.query() (or found on Tyr.local) -- no documents allowed`);
    return false;
  }

  if (!subjectDocument.$model) {
    plugin.error(
      `The subjectDocument passed to GraclPlugin.query() must be a tyranid document!`
    );
  }

  if (!plugin.graclHierarchy.resources.has(queriedCollectionName)) {
    plugin.log(
      `Querying against collection (${queriedCollectionName}) with no resource class -- no restriction enforced`
    );
    return {};
  }

  // get all permission actions in order...
  const permissionTypes = [ permissionType ].concat(plugin.getPermissionParents(permissionType));

  /**
   *  Iterate through permissions action hierarchy, getting access
   */
  const getAccess = (permission: Permission) => {
    let perm: boolean;
    for (const type of permissionTypes) {

      if (permission.access[type] === true) {
        // short circuit on true
        return true;
      } else if (permission.access[type] === false) {
        // continue on false, as superior permissions may be true
        perm = false;
      }
    }
    return perm;
  };


  // extract subject and resource Gracl classes
  const ResourceClass = plugin.graclHierarchy.getResource(queriedCollectionName),
        SubjectClass  = plugin.graclHierarchy.getSubject(subjectDocument.$model.def.name),
        subject       = new SubjectClass(subjectDocument);

  plugin.log(
    `restricting query for collection = ${queriedCollectionName} ` +
    `permissionType = ${permissionType} ` +
    `subject = ${subject.toString()}`
  );

  const errorMessageHeader = (
    `Unable to construct query object for ${queriedCollection.name} ` +
    `from the perspective of ${subject.toString()}`
  );

  // get list of all ids in the subject hierarchy,
  // as well as the names of the classes in the resource hierarchy
  const subjectHierarchyIds      = await subject.getHierarchyIds(),
        resourceHierarchyClasses = ResourceClass.getHierarchyClassNames(),
        permissionsQuery = {
          subjectId:    { $in: subjectHierarchyIds },
          resourceType: { $in: resourceHierarchyClasses },
          $or: permissionTypes.map(perm => {
            return {
              [`access.${perm}`]: { $exists: true }
            };
          })
        };

  const permissions = await PermissionsModel.findAll(permissionsQuery);

  // no permissions found, return no restriction
  if (!Array.isArray(permissions) || permissions.length === 0) {
    plugin.log(`No permissions found, returning false`);
    return false;
  }

  type resourceMapEntries = {
    permissions: Map<string, any>,
    collection: Tyr.CollectionInstance
  };

  const resourceMap = permissions.reduce((map, perm) => {
    const resourceCollectionName = <string> perm['resourceType'],
          resourceId = <string> perm['resourceId'];

    if (!map.has(resourceCollectionName)) {
      map.set(resourceCollectionName, {
        collection: Tyr.byName[resourceCollectionName],
        permissions: new Map()
      });
    }

    map.get(resourceCollectionName).permissions.set(resourceId, perm);
    return map;
  }, new Map<string, resourceMapEntries>());


  // loop through all the fields in the collection that we are
  // building the query string for, grabbing all fields that are links
  // and storing them in a map of (linkFieldCollection => Field)
  const queriedCollectionLinkFields = plugin.getCollectionLinksSorted(queriedCollection)
    .reduce((map, field) => {
      map.set(field.def.link, field);
      return map;
    }, new Map<string, Tyr.Field>());

  const queryMaps: Hash<Map<string, Set<string>>> = {
    positive: new Map<string, Set<string>>(),
    negative: new Map<string, Set<string>>()
  };


  const resourceArray = Array.from(resourceMap.values());
  resourceArray.sort((a, b) => {
    const aDepth = plugin.graclHierarchy.getResource(a.collection.def.name).getNodeDepth();
    const bDepth = plugin.graclHierarchy.getResource(b.collection.def.name).getNodeDepth();
    return baseCompare(bDepth, aDepth);
  });


  const alreadySet = new Set<string>();

  // extract all collections that have a relevant permission set for the requested resource
  for (const { collection, permissions } of resourceArray) {
    const collectionName = collection.def.name;

    let queryRestrictionSet = false;
    if (queriedCollectionLinkFields.has(collectionName) ||
        queriedCollectionName === collectionName) {

      for (const permission of permissions.values()) {
        const access = getAccess(permission);
        switch (access) {
          // access needs to be exactly true or false
          case true:
          case false:
            // if a permission was set by a collection of higher depth, keep it...
            if (alreadySet.has(permission.resourceId)) {
              continue;
            } else {
              alreadySet.add(permission.resourceId);
            }
            const key = (access ? 'positive' : 'negative');
            if (!queryMaps[key].has(collectionName)) {
              queryMaps[key].set(collectionName, new Set());
            }
            queryMaps[key].get(collectionName).add(Tyr.parseUid(permission.resourceId).id);
            break;
        }
        queryRestrictionSet = true;
      }

    }
    // otherwise, we need determine how to restricting a query of this object by
    // permissions concerning parents of this object...
    else {
      /**
        Example:

        SETUP: want to query for all posts from database, have permissions
          set for access to posts on posts, blogs, and organizations...

        - for the permissions set on posts specifically, we can just add something like...

          {
            _id: { $in: [ <post-ids>... ] }
          }

        - for the blog permissions, since there is a "blogId" link property on posts,
          we can just add...

          {
            _id: { $in: [ <postIds>... ] },
            blogId: { $in: [ <blogIds>... ] }
          }

        - for the organizations, as there is no organiationId property on the posts,
          we need to find a "path" between posts and organiations (using the pre-computed paths)

            - take all organizationIds present on permissions
            - find all blogs in all those organizations, store in $BLOGS
            - add $BLOGS to query, not overriding permissions set above
      */

      // get computed shortest path between the two collections
      const path = plugin.getShortestPath(queriedCollection, collection);

      if (!path.length) {
        plugin.error(
          `${errorMessageHeader}, as there is no path between ` +
          `collections ${queriedCollectionName} and ${collectionName} in the schema.`
        );
      }

      // remove end of path (which should equal the collection of interest on the permission)
      const pathEndCollectionName = path.pop();

      if (collectionName !== pathEndCollectionName) {
        plugin.error(
          `Path returned for collection pair ${queriedCollectionName} and ${collectionName} is invalid`
        );
      }

      // assert that the penultimate path collection exists as a link on the queriedCollection
      if (!queriedCollectionLinkFields.has(path[1])) {
        plugin.error(
          `Path returned for collection pair ${queriedCollectionName} and ${collectionName} ` +
          `must have the penultimate path exist as a link on the collection being queried, ` +
          `the penultimate collection path between ${queriedCollectionName} and ${collectionName} ` +
          `is ${path[1]}, which is not linked to by ${queriedCollectionName}`
        );
      }

      let positiveIds: string[] = [],
          negativeIds: string[] = [];

      for (const permission of permissions.values()) {
        // grab access boolean for given permissionType
        const access = getAccess(permission);
        switch (access) {
          // access needs to be exactly true or false
          case true:  positiveIds.push(Tyr.parseUid(permission.resourceId).id); break;
          case false: negativeIds.push(Tyr.parseUid(permission.resourceId).id); break;
        }
      }

      const pathEndCollection = Tyr.byName[pathEndCollectionName],
            nextCollection = Tyr.byName[_.last(path)];

      positiveIds = await plugin.stepThroughCollectionPath(positiveIds, pathEndCollection, nextCollection);
      negativeIds = await plugin.stepThroughCollectionPath(negativeIds, pathEndCollection, nextCollection);

      // the remaining path collection is equal to the collection we are trying to query,
      // we don't need to do another link in the path, as the current path collection
      // has a link that exists on the queried collection
      let pathCollectionName: string,
          nextCollectionName: string;
      while (path.length > 2) {
        const pathCollection = Tyr.byName[pathCollectionName = path.pop()],
              nextCollection = Tyr.byName[nextCollectionName = _.last(path)];

        if (!pathCollection) {
          plugin.error(
            `${errorMessageHeader}, invalid collection name given in path! collection: ${pathCollectionName}`
          );
        }

        /**
         * we need to recursively collect objects along the path,
           until we reach a collection that linked to the queriedCollection
         */
        positiveIds = await plugin.stepThroughCollectionPath(positiveIds, pathCollection, nextCollection);
        negativeIds = await plugin.stepThroughCollectionPath(negativeIds, pathCollection, nextCollection);
      }

      // now, "nextCollectionName" should be referencing a collection
      // that is directly linked to by queriedCollection,
      // and positive / negativeIds should contain ids of documents
      // from <nextCollectionName>
      const linkedCollectionName = nextCollection.def.name;

      const addIdsToQueryMap = (access: boolean) => (id: string) => {
        const accessString    = access ? 'positive' : 'negative',
              altAccessString = access ? 'negative' : 'positive';

        const resourceUid = Tyr.byName[linkedCollectionName].idToUid(id);
        if (alreadySet.has(resourceUid)) {
          return;
        } else {
          alreadySet.add(resourceUid);
        }

        if (!queryMaps[accessString].has(linkedCollectionName)) {
          queryMaps[accessString].set(linkedCollectionName, new Set());
        }

        // if the id was set previously, by a lower level link,
        // dont override the lower level
        if (!queryMaps[altAccessString].has(linkedCollectionName) ||
            !queryMaps[altAccessString].get(linkedCollectionName).has(id)) {
          queryMaps[accessString].get(linkedCollectionName).add(id);
        }
      };

      // add the ids to the query maps
      _.each(positiveIds, addIdsToQueryMap(true));
      _.each(negativeIds, addIdsToQueryMap(false));
      queryRestrictionSet = true;
    }

    if (!queryRestrictionSet) {
      plugin.error(
        `${errorMessageHeader}, unable to set query restriction ` +
        `to satisfy permissions relating to collection ${collectionName}`
      );
    }
  }

  const positiveRestriction = plugin.createInQueries(queryMaps['positive'], queriedCollection, '$in'),
        negativeRestriction = plugin.createInQueries(queryMaps['negative'], queriedCollection, '$nin');

  const restricted: Hash<any> = {},
        hasPositive = !!positiveRestriction['$or'].length,
        hasNegative = !!negativeRestriction['$and'].length;

  if (hasNegative && hasPositive) {
    restricted['$and'] = [
      positiveRestriction,
      negativeRestriction
    ];
  } else if (hasNegative) {
    Object.assign(restricted, negativeRestriction);
  } else if (hasPositive) {
    Object.assign(restricted, positiveRestriction);
  }

  return <Hash<any>> restricted;
}
