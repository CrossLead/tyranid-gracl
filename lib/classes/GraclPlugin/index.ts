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
import * as m from './methods/';



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
export class GraclPlugin {


  constructor(opts?: pluginOptions) {
    opts = opts || {};
    const plugin = this;

    if (Array.isArray(opts.permissionTypes) && opts.permissionTypes.length) {
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
  buildLinkGraph: typeof m.buildLinkGraph = m.buildLinkGraph;
  compareCollectionWithField: typeof m.compareCollectionWithField = m.compareCollectionWithField;
  constructPermissionHierarchy: typeof m.constructPermissionHierarchy = m.constructPermissionHierarchy;

  createGraclHierarchy: typeof m.createGraclHierarchy = m.createGraclHierarchy;
  createInQueries: typeof m.createInQueries = m.createInQueries;
  createResource: typeof m.createResource = m.createResource;
  createSubject: typeof m.createSubject = m.createSubject;
  createSchemaNode: typeof m.createSchemaNode = m.createSchemaNode;

  error: typeof m.error = m.error;
  extractIdAndModel: typeof m.extractIdAndModel = m.extractIdAndModel;
  findLinkInCollection: typeof m.findLinkInCollection = m.findLinkInCollection;
  formatPermissionType: typeof m.formatPermissionType = m.formatPermissionType;

  getAllowedPermissionsForCollection: typeof m.getAllowedPermissionsForCollection = m.getAllowedPermissionsForCollection;
  getAllPossiblePermissionTypes: typeof m.getAllPossiblePermissionTypes = m.getAllPossiblePermissionTypes;
  getCollectionLinksSorted: typeof m.getCollectionLinksSorted = m.getCollectionLinksSorted;
  getGraclClasses: typeof m.getGraclClasses = m.getGraclClasses;
  getObjectHierarchy: typeof m.getObjectHierarchy = m.getObjectHierarchy;
  getPermissionChildren: typeof m.getPermissionChildren = m.getPermissionChildren;
  getPermissionObject: typeof m.getPermissionObject = m.getPermissionObject;
  getPermissionParents: typeof m.getPermissionParents = m.getPermissionParents;
  getShortestPath: typeof m.getShortestPath = m.getShortestPath;

  isCrudPermission: typeof m.isCrudPermission = m.isCrudPermission;

  log: typeof m.log = m.log;
  logHierarchy: typeof m.logHierarchy = m.logHierarchy;

  makeRepository: typeof m.makeRepository = m.makeRepository;
  mixInDocumentMethods: typeof m.mixInDocumentMethods = m.mixInDocumentMethods;
  nextPermissions: typeof m.nextPermissions = m.nextPermissions;
  parsePermissionString: typeof m.parsePermissionString = m.parsePermissionString;
  query: typeof m.query = m.query;
  registerAllowedPermissionsForCollections: typeof m.registerAllowedPermissionsForCollections = m.registerAllowedPermissionsForCollections;
  stepThroughCollectionPath: typeof m.stepThroughCollectionPath = m.stepThroughCollectionPath;

  validateAsResource: typeof m.validateAsResource = m.validateAsResource;
  validatePermissionExists: typeof m.validatePermissionExists = m.validatePermissionExists;
  validatePermissionForResource: typeof m.validatePermissionForResource = m.validatePermissionForResource;


}
