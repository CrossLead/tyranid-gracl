export type Hash<T> = {
  [key: string]: T;
};

export type permissionTypeList = {
  [key: string]: any,
  abstract?: boolean,
  collection?: boolean,
  name: string,
  parents?: string[]
}[];

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
  };
  types?: ('string' | 'resource')[];
}
