import { Tyr } from 'tyranid';

export interface Hash<T> {
  [key: string]: T;
}

export type permissionTypeList = permissionType[];

export interface permissionType {
  abstract?: boolean;
  format?: string | ((action: string, collection?: string) => string);
  collection?: boolean;
  name: string;
  parents?: string[];
  parent?: string;
  collection_parents?: string[];
}

export type permissionHierarchy = Hash<any>;

export interface permissionExplaination {
  type: string;
  reason: string;
  access: boolean;
}

export interface pluginOptions {
  verbose?: boolean;
  permissionTypes?: permissionTypeList;
}

export interface schemaGraclConfigObject {
  permissions?: {
    thisCollectionOnly?: boolean;
    excludeCollections?: string[];
    includeCollections?: string[];
    include?: string[];
    exclude?: string[];
  };
  types?: Array<'string' | 'resource'>;
}

export interface TyrSchemaGraphObjects {
  links: Tyr.FieldInstance[];
  parents: Tyr.CollectionInstance[];
}
