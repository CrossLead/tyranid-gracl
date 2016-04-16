import Tyr from 'tyranid';
import * as _ from 'lodash';
import { PermissionsModel } from './models/PermissionsModel';


/**
 *  Methods to mixin to Tyr.documentPrototype for working with permissions
 */
export const documentMethods = {


  $removePermissionAsSubject(permissionType: string, type?: 'allow' | 'deny', uid?: string): Promise<Tyr.Document> {
    return <Promise<Tyr.Document>> this.$removeEntityPermission('subject', permissionType, type, uid);
  },


  $removePermissionAsResource(permissionType: string, type?: 'allow' | 'deny', uid?: string): Promise<Tyr.Document> {
    return <Promise<Tyr.Document>> this.$removeEntityPermission('resource', permissionType, type, uid);
  },


  async $removeEntityPermission(
      graclType: 'subject' | 'resource',
      permissionType: string,
      accessType?: 'allow' | 'deny',
      alternateUid?: string
    ): Promise<Tyr.Document> {
    if (!(graclType === 'subject' || graclType === 'resource')) {
      throw new TypeError(`graclType must be subject or resource`);
    }

    const altType = graclType === 'subject'
      ? 'resource'
      : 'subject';

    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();

    if (!permissionType) {
      throw new TypeError(`No permissionType given!`);
    }

    plugin.validatePermissionExists(permissionType);

    if (alternateUid && (typeof alternateUid !== 'string')) {
      throw new TypeError(`${altType} uid must be string`);
    }

    if (accessType && !(accessType === 'allow' || accessType === 'deny')) {
      throw new TypeError(`accessType must be allow or deny`);
    }

    if (graclType === 'resource') plugin.permissionsModel.validateAsResource(doc.$model);

    const query: { [key: string]: any } = {
      [`${graclType}Id`]: doc.$uid
    };

    if (alternateUid) {
      query[`${altType}Id`] = alternateUid;
    };

    if (accessType) {
      query[`access.${permissionType}`] = (accessType === 'allow');
    }

    const update = {
      $unset: {
        [`access.${permissionType}`]: 1
      }
    };


    const matchingPerms = await PermissionsModel.findAll(query);

    await PermissionsModel.db.update(query, update, { multi: true });

    const matchingPermsAfter = await PermissionsModel.findAll(query);

    return doc;
  },


  // return collections that a document can view
  $allowedEntitiesForCollection(collectionName: string): Promise<string[]>  {
    const context = <any> this,
          doc = <Tyr.Document> context,
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
    const context = <any> this,
          doc = <Tyr.Document> context,
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


  $permissions(permissionType?: string, graclType?: 'resource' | 'subject', direct?: boolean): Promise<Tyr.Document[]> {
    const context = <any> this,
          doc = <Tyr.Document> context;

    const plugin = PermissionsModel.getGraclPlugin();
    if (permissionType) plugin.validatePermissionExists(permissionType);

    graclType = graclType || 'subject';
    if (graclType !== 'resource' && graclType !== 'subject') {
      throw new TypeError(`graclType must be either subject or resource!`);
    }
    return graclType === 'resource'
      ? PermissionsModel.getPermissionsOfTypeForResource(doc, permissionType, direct)
      : PermissionsModel.getPermissionsOfTypeForSubject(doc, permissionType, direct);
  },


  $setPermissionAccess(
      permissionType: string,
      access: boolean,
      subjectDocument: Tyr.Document | string = Tyr.local.user
    ): Promise<Tyr.Document> {
    const plugin = PermissionsModel.getGraclPlugin();
    plugin.validatePermissionExists(permissionType);
    const context = <any> this,
          doc = <Tyr.Document> context;

    return PermissionsModel.setPermissionAccess(doc, permissionType, access, subjectDocument);
  },


  async $isAllowed(
    permissionType: string,
    subjectDocument: Tyr.Document | string = Tyr.local.user
  ): Promise<boolean> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin();
    plugin.validatePermissionExists(permissionType);
    PermissionsModel.validateAsResource(doc.$model);

    return PermissionsModel.isAllowed(doc, permissionType, subjectDocument);
  },


  $isAllowedForThis(permissionAction: string, subjectDocument: Tyr.Document | string = Tyr.local.user): Promise<boolean> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
          });

    return this.$isAllowed(permissionType, subjectDocument);
  },


  $allow(permissionType: string, subjectDocument: Tyr.Document | string = Tyr.local.user): Promise<Tyr.Document> {
    return <Promise<Tyr.Document>> this.$setPermissionAccess(permissionType, true, subjectDocument);
  },


  $deny(permissionType: string, subjectDocument: Tyr.Document | string = Tyr.local.user): Promise<Tyr.Document> {
    return <Promise<Tyr.Document>> this.$setPermissionAccess(permissionType, false, subjectDocument);
  },


  $allowForThis(permissionAction: string, subjectDocument: Tyr.Document | string = Tyr.local.user): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
          });

    return <Promise<Tyr.Document>> this.$allow(permissionType, subjectDocument);
  },


  $denyForThis(permissionAction: string, subjectDocument: Tyr.Document | string = Tyr.local.user): Promise<Tyr.Document> {
    const context = <any> this,
          doc = <Tyr.Document> context,
          plugin = PermissionsModel.getGraclPlugin(),
          permissionType = plugin.formatPermissionType({
            action: permissionAction,
            collection: doc.$model.def.name
          });

    return <Promise<Tyr.Document>> this.$deny(permissionType, subjectDocument);
  },


  async $explainPermission(permissionType: string, subjectDocument: Tyr.Document | string = Tyr.local.user) {
    const context = <any> this,
          doc = <Tyr.Document> context;

    return PermissionsModel.explainPermission(doc, permissionType, subjectDocument);
  }


};
