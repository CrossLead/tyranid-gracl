import Tyr from 'tyranid';
import * as _ from 'lodash';
import { PermissionsModel } from './models/PermissionsModel';


/**
 *  Methods to mixin to Tyr.documentPrototype for working with permissions
 */
export const documentMethods = {


  // return collections that a document can view
  $allowedEntitiesForCollection(collectionName: string): Promise<string[]>  {
    const doc = <Tyr.Document> this,
          plugin = PermissionsModel.getGraclPlugin();

    // get all the resource entities with view-<collection> permission set to true
    return <Promise<string[]>> doc['$entitiesWithPermission'](
      plugin.formatPermissionType({
        action: 'view',
        collection: collectionName
      })
    );
  },


  async $entitiesWithPermission(permissionType: string, graclType?: 'resource' | 'subject'): Promise<string[]> {
    const doc = <Tyr.Document> this,
          plugin = PermissionsModel.getGraclPlugin();

    graclType = graclType || 'subject';

    const otherType = graclType === 'resource' ? 'subjectId' : 'resourceId',
          allPermissionTypes = [ permissionType ].concat(plugin.getPermissionParents(permissionType));

    return <string[]> _.chain(await PermissionsModel.findAll({
      [`${graclType}Id`]: doc.$uid,
      $or: allPermissionTypes.map(perm => {
        return { [`access.${perm}`]: true };
      })
    }))
    .map(otherType)
    .unique()
    .value();
  },


  $permissions(permissionType?: string, graclType?: 'resource' | 'subject') {
    const doc = <Tyr.Document> this;
    graclType = graclType || 'subject';
    if (graclType !== 'resource' && graclType !== 'subject') {
      throw new TypeError(`graclType must be either subject or resource!`);
    }
    return graclType === 'resource'
      ? PermissionsModel.getPermissionsOfTypeForResource(doc, permissionType)
      : PermissionsModel.getPermissionsOfTypeForSubject(doc, permissionType);
  },


  $setPermissionAccess(
      permissionType: string,
      access: boolean,
      subjectDocument = Tyr.local.user
    ): Promise<Tyr.Document> {

    const doc = <Tyr.Document> this;
    return PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
  },


  $isAllowed(
    permissionType: string,
    subjectDocument = Tyr.local.user
  ): Promise<boolean> {
    const doc = <Tyr.Document> this;
    return PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
  },


  $isAllowedForThis(permissionAction: string, subjectDocument = Tyr.local.user): Promise<boolean> {
    const doc = <Tyr.Document> this,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
          });

    return this.$isAllowed(permissionType, subjectDocument);
  },


  $allow(permissionType: string, subjectDocument = Tyr.local.user): Promise<Tyr.Document> {
    return this.$setPermissionAccess(permissionType, true, subjectDocument);
  },


  $deny(permissionType: string, subjectDocument = Tyr.local.user): Promise<Tyr.Document> {
    return this.$setPermissionAccess(permissionType, false, subjectDocument);
  },


  $allowForThis(permissionAction: string, subjectDocument = Tyr.local.user): Promise<Tyr.Document> {
    const doc = <Tyr.Document> this,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
          });

    return this.$allow(permissionType, subjectDocument);
  },


  $denyForThis(permissionAction: string, subjectDocument = Tyr.local.user): Promise<Tyr.Document> {
    const doc = <Tyr.Document> this,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
          });

    return this.$deny(permissionType, subjectDocument);
  },


  $explainPermission(permissionType: string, subjectDocument = Tyr.local.user) {
    const doc = <Tyr.Document> this;
    return PermissionsModel.explainPermission(doc, permissionType, subjectDocument);
  }


};
