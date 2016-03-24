/// <reference path="../../../../typings/main.d.ts" />
import * as Tyr from 'tyranid';
import * as gracl from 'gracl';
import { PermissionsModel } from '../models/PermissionsModel';
import { Hash } from '../util';
export declare class GraclPlugin {
    verbose: boolean;
    static isAllowed: typeof PermissionsModel.isAllowed;
    static setPermissionAccess: typeof PermissionsModel.setPermissionAccess;
    static deletePermissions: typeof PermissionsModel.deletePermissions;
    static documentMethods: {
        $setPermissionAccess(permissionType: string, access: boolean, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
        $isAllowed(permissionType: string, subjectDocument?: Tyr.Document): Promise<boolean>;
        $isAllowedForThis(permissionAction: string, subjectDocument?: Tyr.Document): Promise<boolean>;
        $allow(permissionType: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
        $deny(permissionType: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
        $allowForThis(permissionAction: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
        $denyForThis(permissionAction: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
    };
    static makeRepository(collection: Tyr.CollectionInstance): gracl.Repository;
    static buildLinkGraph(): Hash<Hash<string>>;
    graclHierarchy: gracl.Graph;
    outgoingLinkPaths: Hash<Hash<string>>;
    unsecuredCollections: Set<string>;
    isAllowed: typeof PermissionsModel.isAllowed;
    setPermissionAccess: typeof PermissionsModel.setPermissionAccess;
    deletePermissions: typeof PermissionsModel.deletePermissions;
    constructor(verbose?: boolean);
    log(message: string): this;
    getObjectHierarchy(): {
        subjects: {};
        resources: {};
    };
    getShortestPath(colA: Tyr.CollectionInstance, colB: Tyr.CollectionInstance): string[];
    boot(stage: Tyr.BootStage): void;
    logHierarchy(): void;
    query(queriedCollection: Tyr.CollectionInstance, permissionAction: string, subjectDocument?: Tyr.Document): Promise<boolean | {}>;
}
