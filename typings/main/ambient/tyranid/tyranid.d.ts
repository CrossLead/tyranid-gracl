// Compiled using typings@0.6.8
// Source: https://raw.githubusercontent.com/tyranid-org/tyranid-typings/master/tyranid/index.d.ts
/**
 *  Type definitions for tyranid.js
 */
declare module 'tyranid' {


  /**
   *  Generic tyranid document object.
   */
  export type Document = any;


  /**
   *  Hash of strings -> fields
   */
  export type TyranidFieldsObject = {
    [fieldName: string]: TyranidFieldDefinition;
  }


  /**
   *  TyranidCollectionDefinition options for tyranid collection
   */
  export type TyranidCollectionDefinition = {
    id: string;
    name: string;
    dbName: string;
    label?: string;
    help?: string;
    note?: string;
    enum?: boolean;
    client?: boolean;
    primaryKey?: {
      field: TyranidFieldDefinition;
      defaultMatchIdOnInsert?: boolean;
    };
    timestamps?: boolean;
    express?: {
      rest?: boolean;
      get?: boolean;
      post?: boolean;
      put?: boolean;
    };
    fields?: TyranidFieldsObject;
    methods?: {
      [methodName: string]: {
        fn: Function;
        fnClient: Function;
        fnServer: Function;
      }
    };
    values?: String[][];
  }


  /**
   *  Configuration definition for tyranid field.
   */
  export type TyranidFieldDefinition = {
    is: string;
    client?: boolean;
    db?: boolean;
    label?: string;
    pathLabel?: string;
    help?: string;
    note?: string;
    required?: boolean;
    defaultValue?: any;
    of?: TyranidFieldDefinition;
    fields?: TyranidFieldsObject;
    keys?: TyranidFieldDefinition;
    denormal?: any;
    link?: string;
    where?: any;
    in?: string;
    labelField?: boolean;
    get?: Function;
    getClient?: Function;
    getServer?: Function;
    set?: Function;
    setClient?: Function;
    setServer?: Function;
  }


  /**
   *  Tyranid collection class
   */
  export class Collection {
    // constructor
    new (def: TyranidCollectionDefinition): Collection;

    // fake a document for this collection
    fake(options: { n?: number, schemaOpts?: any, seed?: number }): Promise<Document>;

    find(...args: any[]): Promise<Document[]>;
    findOne(...args: any[]): Promise<Document>;
    findAndModify(...args: any[]): Promise<Document>;
    fromClient(doc: any, path?: string): Document;

    fieldsFor(obj: any): Promise<Field[]>
  }


  /**
   *  Tyranid field
   */
  export class Field {

  }


}