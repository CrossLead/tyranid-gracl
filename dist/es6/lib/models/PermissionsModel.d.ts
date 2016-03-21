/// <reference path="../../../../typings/main.d.ts" />
import * as Tyr from 'tyranid';
export declare const PermissionsBaseCollection: Tyr.CollectionInstance;
export declare class PermissionsModel extends  {
    static setPermissionAccess(resourceDocument: Tyr.Document, permissionType: string, access: boolean, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
    static updatePermissions(resourceDocument: Tyr.Document): Promise<Tyr.Document>;
    static deletePermissions(doc: Tyr.Document): Promise<Tyr.Document>;
}
