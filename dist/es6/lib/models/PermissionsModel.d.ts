/// <reference path="../../../../typings/main.d.ts" />
import Tyr from 'tyranid';
import * as gracl from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';
export declare const PermissionsBaseCollection: Tyr.CollectionInstance;
export declare class PermissionsModel extends  {
    static getGraclPlugin(): GraclPlugin;
    static validatePermissionType(permissionType: string, queriedCollection: Tyr.CollectionInstance): void;
    static validateAsResource(collection: Tyr.CollectionInstance): void;
    static getGraclClasses(resourceDocument: Tyr.Document, subjectDocument: Tyr.Document): Promise<{
        subject: gracl.Subject;
        resource: gracl.Resource;
    }>;
    static createSubject(subjectDocument: Tyr.Document): gracl.Subject;
    static createResource(resourceDocument: Tyr.Document): gracl.Resource;
    static getPermissionsOfTypeForResource(resourceDocument: Tyr.Document, permissionType?: string): Promise<Tyr.Document[]>;
    static getPermissionsOfTypeForSubject(subjectDocument: Tyr.Document, permissionType?: string): Promise<Tyr.Document[]>;
    static setPermissionAccess(resourceDocument: Tyr.Document, permissionType: string, access: boolean, subjectDocument?: Tyr.Document, abstract?: boolean): Promise<Tyr.Document>;
    static isAllowed(resourceDocument: Tyr.Document, permissionType: string, subjectDocument?: Tyr.Document, abstract?: boolean): Promise<boolean>;
    static explainPermission(resourceDocument: Tyr.Document, permissionType: string, subjectDocument?: Tyr.Document, abstract?: boolean): Promise<{
        type: string;
        access: boolean;
        reason: string;
    }>;
    static lockPermissionsForResource(resourceDocument: Tyr.Document): Promise<void>;
    static unlockPermissionsForResource(resourceDocument: Tyr.Document): Promise<void>;
    static updatePermissions(resourceDocument: Tyr.Document): Promise<Tyr.Document>;
    static deletePermissions(doc: Tyr.Document): Promise<Tyr.Document>;
}
