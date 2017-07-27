import { Tyr } from 'tyranid';

export type Hash<T> = {
  [key: string]: T;
};

export type permissionTypeList = permissionType[];

export type permissionType = {
  abstract?: boolean;
  format?: string | ((action: string, collection?: string) => string);
  collection?: boolean;
  name: string;
  parents?: string[];
  parent?: string;
  collection_parents?: string[];
};

export type permissionHierarchy = Hash<any>;

export type permissionExplaination = {
  type: string;
  reason: string;
  access: boolean;
};

export type pluginOptions = {
  verbose?: boolean;
  permissionTypes?: permissionTypeList;
};

export type schemaGraclConfigObject = {
  permissions?: {
    thisCollectionOnly?: boolean;
    excludeCollections?: string[];
    includeCollections?: string[];
    include?: string[];
    exclude?: string[];
  };
  types?: ('string' | 'resource')[];
};

export type TyrSchemaGraphObjects = {
  links: Tyr.FieldInstance[];
  parents: Tyr.CollectionInstance[];
};
