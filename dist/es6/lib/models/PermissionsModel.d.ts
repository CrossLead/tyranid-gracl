/// <reference path="../../../../typings/main.d.ts" />
import * as Tyr from 'tyranid';
import * as gracl from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
export declare const PermissionsBaseCollection: Tyr.CollectionInstance;
export declare class PermissionsModel extends  {
    static validPermissionActions: Set<string>;
    static getGraclPlugin(): GraclPlugin;
    static validatePermissionType(permissionType: string): void;
    static getGraclClasses(resourceDocument: Tyr.Document, subjectDocument: Tyr.Document): Promise<{
        subject: gracl.Subject;
        resource: gracl.Resource;
    }>;
    static setPermissionAccess(resourceDocument: Tyr.Document, permissionType: string, access: boolean, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
    static isAllowed(resourceDocument: Tyr.Document, permissionType: string, subjectDocument?: Tyr.Document): Promise<boolean>;
    static updatePermissions(resourceDocument: Tyr.Document): Promise<Tyr.Document>;
    static deletePermissions(doc: Tyr.Document): Promise<Tyr.Document>;
}
