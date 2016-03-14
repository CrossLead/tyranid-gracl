/// <reference path="../../../../typings/main.d.ts" />
import Tyr from 'tyranid';
export declare const PermissionsBaseCollection: Tyr.CollectionInstance;
export declare class PermissionsModel extends  {
    setAccess(doc: Tyr.Document, access: boolean): Promise<Tyr.Document>;
    deletePermissionsForSubject(doc: Tyr.Document): Promise<void>;
}
