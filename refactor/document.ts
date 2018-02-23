import { Tyr } from 'tyranid';
import { GraclPermission } from './model';
import { Plugin } from './interfaces/plugin';
import { DocumentPermissionsMethods } from './interfaces/document';

/**
 * given an instance of the plugin, create methods
 * to mix into the document prototype
 */
export function createDocumentMethods(
  plugin: Plugin
): DocumentPermissionsMethods {
  return {
    async $removePermissionAsSubject(permissionType, type, uid) {
      return this;
    },

    async $removePermissionAsResource(permissionType, type, uid) {
      return this;
    },

    async $removeEntityPermission(graclType, permissionType, type, uid) {
      return this;
    },

    async $entitiesWithPermission(permissionType, graclType) {
      return [];
    },

    async $permissions(permissionType, graclType, direct) {
      return [];
    },

    async $updatePermissions(permissionChanges, subjectDocument) {
      return null;
    },

    async $isAllowed(permissionType, subjectDocument) {
      return false;
    },

    async $isAllowedForThis(permissionAction, subjectDocument) {
      return false;
    },

    async $allow(permissionType, subjectDocument) {
      return this;
    },

    async $deny(permissionType, subjectDocument) {
      return this;
    },

    async $allowForThis(permissionType, subjectDocument) {
      return this;
    },

    async $denyForThis(permissionType, subjectDocument) {
      return this;
    },

    async $explainPermission(permissionType, subjectDocument) {
      return {
        type: '',
        reason: '',
        access: false
      };
    },

    async $determineAccess(permissionType, subjectDocument) {
      return {};
    },

    async $determineAccessToAllPermissionsForResources(
      permissionsToCheck,
      resourceUidList
    ) {
      return {};
    },

    async $canAccessThis(permissionsToCheck = 'view', ...more) {
      return [];
    },

    async $deniedAccessToThis(permissionsToCheck = 'view', ...more) {
      return [];
    }
  };
}

// export function $removePermissionAsSubject<T extends Tyr.Document>(
//   this: T,
//   permissionType: string,
//   type?: 'allow' | 'deny',
//   uid?: string
// ) {
//   return this.$removeEntityPermission('subject', permissionType, type, uid);
// }

// export function $removePermissionAsResource<T extends Tyr.Document>(
//   this: T,
//   permissionType: string,
//   type?: 'allow' | 'deny',
//   uid?: string
// ) {
//   const plugin = PermissionsModel.getGraclPlugin();
//   validatePermissionForResource(plugin, permissionType, this.$model);
//   return this.$removeEntityPermission('resource', permissionType, type, uid);
// }

// export async function $removeEntityPermission<T extends Tyr.Document>(
//   this: T,
//   graclType: 'subject' | 'resource',
//   permissionType: string,
//   accessType?: 'allow' | 'deny',
//   alternateUid?: string
// ): Promise<T> {
//   if (!(graclType === 'subject' || graclType === 'resource')) {
//     throw new TypeError(`graclType must be subject or resource`);
//   }

//   const altType = graclType === 'subject' ? 'resource' : 'subject';

//   const plugin = PermissionsModel.getGraclPlugin();

//   if (!permissionType) {
//     throw new TypeError(`No permissionType given!`);
//   }

//   if (graclType === 'resource') {
//     validatePermissionForResource(
//       PermissionsModel.getGraclPlugin(),
//       permissionType,
//       this.$model
//     );
//   }

//   validatePermissionExists(plugin, permissionType);

//   if (alternateUid && typeof alternateUid !== 'string') {
//     throw new TypeError(`${altType} uid must be string`);
//   }

//   if (accessType && !(accessType === 'allow' || accessType === 'deny')) {
//     throw new TypeError(`accessType must be allow or deny`);
//   }

//   if (graclType === 'resource') {
//     validateAsResource(plugin, this.$model);
//   }

//   const query: { [key: string]: string | boolean } = {
//     [`${graclType}Id`]: this.$uid
//   };

//   if (alternateUid) {
//     query[`${altType}Id`] = alternateUid;
//   }

//   if (accessType) {
//     query[`access.${permissionType}`] = accessType === 'allow';
//   }

//   const update = {
//     $unset: {
//       [`access.${permissionType}`]: 1
//     }
//   };

//   await PermissionsModel.db.update(query, update, { multi: true });

//   return this;
// }

// export async function $entitiesWithPermission<T extends Tyr.Document>(
//   this: T,
//   permissionType: string,
//   graclType?: 'resource' | 'subject'
// ): Promise<string[]> {
//   const plugin = PermissionsModel.getGraclPlugin();

//   graclType = graclType || 'subject';

//   if (graclType === 'resource') {
//     validatePermissionForResource(plugin, permissionType, this.$model);
//   }

//   const otherType = graclType === 'resource' ? 'subjectId' : 'resourceId';
//   const allPermissionTypes = [permissionType].concat(
//     getPermissionParents(plugin, permissionType)
//   );

//   return _.chain(
//     await PermissionsModel.findAll({
//       query: {
//         [`${graclType}Id`]: this.$uid,
//         $or: allPermissionTypes.map(perm => {
//           return { [`access.${perm}`]: true };
//         })
//       }
//     })
//   )
//     .map(otherType)
//     .uniq()
//     .value() as string[];
// }

// export function $permissions<T extends Tyr.Document>(
//   this: T,
//   permissionType?: string,
//   graclType?: 'resource' | 'subject',
//   direct?: boolean
// ): Promise<Tyr.Document[]> {
//   const plugin = PermissionsModel.getGraclPlugin();
//   if (permissionType) {
//     validatePermissionExists(plugin, permissionType);
//   }

//   graclType = graclType || 'subject';
//   if (graclType !== 'resource' && graclType !== 'subject') {
//     throw new TypeError(`graclType must be either subject or resource!`);
//   }

//   if (graclType === 'resource' && permissionType) {
//     validatePermissionForResource(plugin, permissionType, this.$model);
//   }

//   return graclType === 'resource'
//     ? PermissionsModel.getPermissionsOfTypeForResource(
//         this,
//         permissionType,
//         direct
//       )
//     : PermissionsModel.getPermissionsOfTypeForSubject(
//         this,
//         permissionType,
//         direct
//       );
// }

// export async function $updatePermissions<T extends Tyr.Document>(
//   this: T,
//   permissionChanges: Hash<boolean>,
//   subjectDocument?: Tyr.Document | string
// ): Promise<T> {
//   const plugin = PermissionsModel.getGraclPlugin();

//   _.each(permissionChanges, (____, p) => {
//     if (p) {
//       validatePermissionForResource(plugin, p, this.$model);
//     }
//   });

//   if (subjectDocument) {
//     const result = await PermissionsModel.updatePermissions(
//       this,
//       permissionChanges,
//       subjectDocument
//     );
//     if (!result) {
//       throw new Error(`No document returned after updatePermissions!`);
//     }
//     return result as T;
//   }

//   return plugin.error(`No subject given to doc.$updatePermissions()`);
// }

// export function $isAllowed<T extends Tyr.Document>(
//   this: T,
//   permissionType: string,
//   subjectDocument?: Tyr.Document | string
// ): Promise<boolean> {
//   const plugin = PermissionsModel.getGraclPlugin();
//   validatePermissionForResource(plugin, permissionType, this.$model);
//   if (subjectDocument) {
//     return PermissionsModel.isAllowed(this, permissionType, subjectDocument);
//   }
//   return plugin.error(`No subject given to doc.$isAllowed()`);
// }

// export function $isAllowedForThis<T extends Tyr.Document>(
//   this: T,
//   permissionAction: string,
//   subjectDocument?: Tyr.Document | string
// ): Promise<boolean> {
//   const plugin = PermissionsModel.getGraclPlugin();

//   if (!isCrudPermission(plugin, permissionAction)) {
//     plugin.error(
//       `Can only use $isAllowedForThis with a crud action, given ${permissionAction}`
//     );
//   }

//   const permissionType = formatPermissionType(plugin, {
//     action: permissionAction,
//     collection: this.$model.def.name
//   });

//   validatePermissionForResource(plugin, permissionType, this.$model);
//   return this.$isAllowed(permissionType, subjectDocument);
// }

// export function $allow<T extends Tyr.Document>(
//   this: T,
//   permissionType: string | string[],
//   subjectDocument?: Tyr.Document | string
// ): Promise<T> {
//   const permissionUpdates: Hash<boolean> = {};

//   if (typeof permissionType === 'string') {
//     permissionUpdates[permissionType] = true;
//   } else {
//     _.each(permissionType, p => {
//       permissionUpdates[p] = true;
//     });
//   }

//   return this.$updatePermissions(permissionUpdates, subjectDocument);
// }

// export function $deny<T extends Tyr.Document>(
//   this: T,
//   permissionType: string | string[],
//   subjectDocument?: Tyr.Document | string
// ): Promise<T> {
//   const permissionUpdates: Hash<boolean> = {};

//   if (typeof permissionType === 'string') {
//     permissionUpdates[permissionType] = false;
//   } else {
//     _.each(permissionType, p => {
//       permissionUpdates[p] = false;
//     });
//   }

//   return this.$updatePermissions(permissionUpdates, subjectDocument);
// }

// export function $allowForThis<T extends Tyr.Document>(
//   this: T,
//   permissionAction: string | string[],
//   subjectDocument?: Tyr.Document | string
// ): Promise<T> {
//   const plugin = PermissionsModel.getGraclPlugin();

//   const crud =
//     typeof permissionAction === 'string'
//       ? isCrudPermission(plugin, permissionAction)
//       : permissionAction.every(p => !!isCrudPermission(plugin, p));

//   if (!crud) {
//     plugin.error(
//       `Can only use $allowForThis with a crud action, given ${permissionAction}`
//     );
//   }

//   const permissionType = _.map(
//     typeof permissionAction === 'string'
//       ? [permissionAction]
//       : permissionAction,
//     p =>
//       formatPermissionType(plugin, {
//         action: p,
//         collection: this.$model.def.name
//       })
//   );

//   return this.$allow(permissionType, subjectDocument);
// }

// export function $denyForThis<T extends Tyr.Document>(
//   this: T,
//   permissionAction: string | string[],
//   subjectDocument?: Tyr.Document | string
// ): Promise<T> {
//   const plugin = PermissionsModel.getGraclPlugin();

//   const crud =
//     typeof permissionAction === 'string'
//       ? isCrudPermission(plugin, permissionAction)
//       : permissionAction.every(p => !!isCrudPermission(plugin, p));

//   if (!crud) {
//     plugin.error(
//       `Can only use $denyForThis with a crud action, given ${permissionAction}`
//     );
//   }

//   const permissionType = _.map(
//     typeof permissionAction === 'string'
//       ? [permissionAction]
//       : permissionAction,
//     p =>
//       formatPermissionType(plugin, {
//         action: p,
//         collection: this.$model.def.name
//       })
//   );
//   return this.$deny(permissionType, subjectDocument);
// }

// export async function $explainPermission<T extends Tyr.Document>(
//   this: T,
//   permissionType: string,
//   subjectDocument?: Tyr.Document | string
// ): Promise<PermissionExplaination> {
//   const plugin = PermissionsModel.getGraclPlugin();
//   validatePermissionForResource(plugin, permissionType, this.$model);
//   if (subjectDocument) {
//     return PermissionsModel.explainPermission(
//       this,
//       permissionType,
//       subjectDocument
//     );
//   }
//   return plugin.error(`No subjectDocument given to doc.$explainPermission!`);
// }

// export async function $determineAccess<T extends Tyr.Document>(
//   this: T,
//   permissionType: string | string[],
//   subjectDocument?: Tyr.Document | string
// ) {
//   const plugin = PermissionsModel.getGraclPlugin();

//   const permissions =
//     typeof permissionType === 'string' ? [permissionType] : permissionType;

//   permissions.forEach(p =>
//     validatePermissionForResource(plugin, p, this.$model)
//   );
//   if (subjectDocument) {
//     return PermissionsModel.determineAccess(this, permissions, subjectDocument);
//   }
//   return plugin.error(`No subjectDocument given to doc.$determineAccess()`);
// }

// export async function $determineAccessToAllPermissionsForResources<
//   T extends Tyr.Document
// >(
//   this: T,
//   permissionsToCheck: string[],
//   resourceUidList: string[] | Tyr.Document[]
// ) {
//   return PermissionsModel.determineAccesstoAllPermissions(
//     this,
//     permissionsToCheck,
//     resourceUidList
//   );
// }

// export function $canAccessThis<T extends Tyr.Document>(
//   this: T,
//   permissionsToCheck: string | string[] = 'view',
//   ...more: Array<string | string[]>
// ): Promise<Tyr.Document[]> {
//   const permissions: string[] = [];

//   if (typeof permissionsToCheck === 'string') {
//     permissions.push(permissionsToCheck);
//   } else {
//     permissions.push(...permissionsToCheck);
//   }

//   permissions.push(..._.flatten(more));

//   return PermissionsModel.findEntitiesWithPermissionAccessToResource(
//     'allow',
//     permissions,
//     this
//   );
// }

// export function $deniedAccessToThis<T extends Tyr.Document>(
//   this: T,
//   permissionsToCheck: string | string[] = 'view',
//   ...more: Array<string | string[]>
// ): Promise<Tyr.Document[]> {
//   const permissions: string[] = [];

//   if (typeof permissionsToCheck === 'string') {
//     permissions.push(permissionsToCheck);
//   } else {
//     permissions.push(...permissionsToCheck);
//   }

//   permissions.push(..._.flatten(more));

//   return PermissionsModel.findEntitiesWithPermissionAccessToResource(
//     'deny',
//     permissions,
//     this
//   );
// }
