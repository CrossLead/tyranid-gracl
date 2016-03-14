/// <reference path="../../../../typings/main.d.ts" />
import * as Tyr from 'tyranid';
import { GraclPlugin } from '../classes/GraclPlugin';
export declare const PermissionsBaseCollection: Tyr.CollectionInstance;
export declare class PermissionsModel extends  {
    static setAccess(doc: Tyr.Document, access: boolean): Promise<Tyr.Document>;
    static updatePermissions(doc: Tyr.Document, graclType: string): Promise<void>;
    static deletePermissions(doc: Tyr.Document, graclType: string): Promise<void>;
    static getGraclPlugin(): GraclPlugin;
}
