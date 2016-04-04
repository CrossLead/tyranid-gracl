/// <reference path="../../../../typings/main.d.ts" />
import Tyr from 'tyranid';
import * as gracl from 'gracl';
import { PermissionsModel } from '../models/PermissionsModel';
import { Hash } from '../util';
export declare type permissionTypeList = {
    [key: string]: any;
    abstract?: boolean;
    collection?: boolean;
    name: string;
    parents?: string[];
}[];
export declare type permissionHierarchy = Hash<any>;
export declare type pluginOptions = {
    verbose?: boolean;
    permissionTypes?: permissionTypeList;
    permissionIdProperty?: string;
};
export declare class GraclPlugin {
    static documentMethods: {
        $permissions(permissionType?: string, graclType?: "resource" | "subject"): Promise<Tyr.Document[]>;
        $setPermissionAccess(permissionType: string, access: boolean, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
        $isAllowed(permissionType: string, subjectDocument?: Tyr.Document): Promise<boolean>;
        $isAllowedForThis(permissionAction: string, subjectDocument?: Tyr.Document): Promise<boolean>;
        $allow(permissionType: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
        $deny(permissionType: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
        $allowForThis(permissionAction: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
        $denyForThis(permissionAction: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
        $explainPermission(permissionType: string, subjectDocument?: Tyr.Document): Promise<{
            type: string;
            access: boolean;
            reason: string;
        }>;
    };
    static buildLinkGraph(): Hash<Hash<string>>;
    graclHierarchy: gracl.Graph;
    outgoingLinkPaths: Hash<Hash<string>>;
    unsecuredCollections: Set<string>;
    verbose: boolean;
    permissionHierarchy: permissionHierarchy;
    populatedPermissionsProperty: string;
    permissionIdProperty: string;
    permissionsModel: typeof PermissionsModel;
    permissionTypes: permissionTypeList;
    constructor(opts?: pluginOptions);
    parsePermissionString(perm: string): {
        action: string;
        collection: string;
    };
    formatPermissionType(components: {
        action: string;
        collection?: string;
    }): string;
    constructPermissionHierarchy(permissionsTypes: permissionTypeList): permissionHierarchy;
    makeRepository(collection: Tyr.CollectionInstance): gracl.Repository;
    getPermissionObject(permissionString: string): any;
    nextPermissions(permissionString: string): string[];
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
