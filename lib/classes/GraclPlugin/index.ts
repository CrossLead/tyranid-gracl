/// <reference path='../../../typings/main.d.ts' />
import Tyr from 'tyranid';
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


import { PermissionsModel } from '../../models/PermissionsModel';
import {
  Hash,
  permissionHierarchy,
  permissionTypeList,
  pluginOptions,
  schemaGraclConfigObject,
  TyrSchemaGraphObjects
} from '../../interfaces';


// methods to mixin
import * as methods from './methods/';



/**
 *  Security plugin for tyranid

  Example:

  ```js
  import Tyr from 'tyranid';
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
@((plugin: typeof GraclPlugin) => {
  Object.assign(plugin.prototype, methods);
  return plugin;
})
export class GraclPlugin {


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

      plugin.mixInDocumentMethods();
      plugin.buildLinkGraph();
      plugin.createGraclHierarchy();
      plugin.constructPermissionHierarchy();
      plugin.registerAllowedPermissionsForCollections();

      if (plugin.verbose) plugin.logHierarchy();
    }
  }


  createIndexes() {
    return PermissionsModel.createIndexes();
  }


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


  // method mixin typings
  buildLinkGraph: typeof methods.buildLinkGraph;
  compareCollectionWithField: typeof methods.compareCollectionWithField;
  constructPermissionHierarchy: typeof methods.constructPermissionHierarchy;
  createGraclHierarchy: typeof methods.createGraclHierarchy;
  createInQueries: typeof methods.createInQueries;
  createResource: typeof methods.createResource;
  createSubject: typeof methods.createSubject;
  createSchemaNode: typeof methods.createSchemaNode;
  error: typeof methods.error;
  extractIdAndModel: typeof methods.extractIdAndModel;
  findLinkInCollection: typeof methods.findLinkInCollection;
  formatPermissionType: typeof methods.formatPermissionType;
  getAllowedPermissionsForCollection: typeof methods.getAllowedPermissionsForCollection;
  getAllPossiblePermissionTypes: typeof methods.getAllPossiblePermissionTypes;
  getCollectionLinksSorted: typeof methods.getCollectionLinksSorted;
  getGraclClasses: typeof methods.getGraclClasses;
  getObjectHierarchy: typeof methods.getObjectHierarchy;
  getPermissionChildren: typeof methods.getPermissionChildren;
  getPermissionObject: typeof methods.getPermissionObject;
  getPermissionParents: typeof methods.getPermissionParents;
  getShortestPath: typeof methods.getShortestPath;
  isCrudPermission: typeof methods.isCrudPermission;
  log: typeof methods.log;
  logHierarchy: typeof methods.logHierarchy;
  makeRepository: typeof methods.makeRepository;
  mixInDocumentMethods: typeof methods.mixInDocumentMethods;
  nextPermissions: typeof methods.nextPermissions;
  parsePermissionString: typeof methods.parsePermissionString;
  query: typeof methods.query;
  registerAllowedPermissionsForCollections: typeof methods.registerAllowedPermissionsForCollections;
  stepThroughCollectionPath: typeof methods.stepThroughCollectionPath;
  validateAsResource: typeof methods.validateAsResource;
  validatePermissionExists: typeof methods.validatePermissionExists;
  validatePermissionForResource: typeof methods.validatePermissionForResource;
}
