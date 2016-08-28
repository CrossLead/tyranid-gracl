import { Tyr } from 'tyranid';
import * as _ from 'lodash';
import {
  Permission,
  topologicalSort,
  Node,
  Graph,
  binaryIndexOf,
  baseCompare,
  SchemaNode,
  Subject,
  Resource,
  Repository
} from 'gracl';


import { PermissionsModel } from '../models/PermissionsModel';

import {
  Hash,
  permissionHierarchy,
  permissionTypeList,
  pluginOptions,
  schemaGraclConfigObject,
  TyrSchemaGraphObjects
} from '../interfaces';

import { query } from '../query/query';

import { mixInDocumentMethods } from '../tyranid/mixInDocumentMethods';

import { buildLinkGraph } from '../graph/buildLinkGraph';
import { createGraclHierarchy } from '../graph/createGraclHierarchy';
import { getObjectHierarchy } from '../graph/getObjectHierarchy';

import { constructPermissionHierarchy } from '../permission/constructPermissionHierarchy';
import { registerAllowedPermissionsForCollections } from '../permission/registerAllowedPermissionsForCollections';
import { parsePermissionString } from '../permission/parsePermissionString';
import { getAllPossiblePermissionTypes } from '../permission/getAllPossiblePermissionTypes';
import { formatPermissionLabel } from '../permission/formatPermissionLabel';
import { getPermissionChildren } from '../permission/getPermissionChildren';
import { getPermissionParents } from '../permission/getPermissionParents';
import { getAllowedPermissionsForCollection } from '../permission/getAllowedPermissionsForCollection';


/**
 *  Security plugin for tyranid

  Example:

  ```js
  import { Tyr } from 'tyranid';
  import pmongo from 'promised-mongo';

  // import plugin class
  import { GraclPlugin } from 'tyranid-gracl';

  // instantiate
  const secure = new GraclPlugin();

  const db = pmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test');

  Tyr.config({
    db: db,
    validate: [
      { dir: root + '/test/models', fileMatch: '[a-z].js' }
    ],
    // add to tyranid config...
    secure: secure
  })
  ```

 */
export class GraclPlugin {

  graclHierarchy: Graph;
  unsecuredCollections = new Set([
    PermissionsModel.def.name
  ]);

  // some collections may have specific permissions
  // they are restricted to...
  permissionRestrictions = new Map<string, Set<string>>();


  // plugin options
  verbose: boolean;
  permissionHierarchy: permissionHierarchy;
  setOfAllPermissions: Set<string>;
  crudPermissionSet = new Set<string>();
  permissionsModel = PermissionsModel;
  resourceChildren = new Map<string, Set<string>>();


  _NO_COLLECTION = 'TYRANID_GRACL_NO_COLLECTION_NAME_FOUND';

  permissionTypes: permissionTypeList = [
    { name: 'edit' },
    { name: 'view', parents: [ 'edit' ] },
    { name: 'delete' }
  ];

  _outgoingLinkPaths: Hash<Hash<string>>;
  _permissionChildCache: Hash<string[]> = {};
  _allPossiblePermissionsCache: string[];
  _sortedLinkCache: Hash<Tyr.Field[]> = {};


  constructor(opts: pluginOptions = {}) {
    const plugin = this;

    if (opts.permissionTypes &&
        Array.isArray(opts.permissionTypes) &&
        opts.permissionTypes.length) {
      plugin.permissionTypes = opts.permissionTypes;
    }

    plugin.verbose = opts.verbose || false;
  };


  /**
    Create Gracl class hierarchy from tyranid schemas,
    needs to be called after all the tyranid collections are validated
   */
  boot(stage: Tyr.BootStage) {
    if (stage === 'post-link') {
      const plugin = this;

      plugin.log(`starting boot.`);

      mixInDocumentMethods(plugin);
      buildLinkGraph(plugin);
      createGraclHierarchy(plugin);
      constructPermissionHierarchy(plugin);
      registerAllowedPermissionsForCollections(plugin);

      if (plugin.verbose) plugin.logHierarchy();
    }
  }


  createIndexes() {
    return PermissionsModel.createIndexes();
  }


  query(
    queriedCollection: Tyr.CollectionInstance,
    permissionType: string,
    subjectDocument: Tyr.Document = Tyr.local.user
  ) {
    return query(this, queriedCollection, permissionType, subjectDocument);
  }

  log(message: string) {
    const plugin = <GraclPlugin> this;
    if (plugin.verbose) {
      console.log(`tyranid-gracl: ${message}`);
    }
    return plugin;
  }

  logHierarchy() {
    const plugin = this;
    plugin.log(`created gracl permissions hierarchy based on tyranid schemas: `);
    console.log(
      '  | \n  | ' +
      JSON
        .stringify(getObjectHierarchy(plugin), <any> null, 4) // TODO: strictNullChecks hack
        .replace(/[{},\":]/g, '')
        .replace(/^\s*\n/gm, '')
        .split('\n')
        .join('\n  | ')
        .replace(/\s+$/, '')
        .replace(/resources/, '---- resources ----')
        .replace(/subjects/, '---- subjects ----') +
      '____'
    );
  }

  error(message: string) {
    throw new Error(`tyranid-gracl: ${message}`);
  }

  parsePermissionString(perm: string) {
    return parsePermissionString(this, perm);
  }

  getAllPossiblePermissionTypes() {
    return getAllPossiblePermissionTypes(this);
  }

  getPermissionParents(perm: string) {
    return getPermissionParents(this, perm);
  }

  getPermissionChildren(perm: string) {
    return getPermissionChildren(this, perm);
  }

  getAllowedPermissionsForCollection(perm: string) {
    return getAllowedPermissionsForCollection(this, perm);
  }

  formatPermissionLabel(perm: string) {
    return formatPermissionLabel(this, perm);
  }

}
