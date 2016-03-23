/// <reference path="../../../../typings/main.d.ts" />
import * as Tyr from 'tyranid';
import * as gracl from 'gracl';
import { Hash } from '../util';
export declare const documentMethods: {
    $setPermissionAccess(permissionType: string, access: boolean, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
    $isAllowed(permissionType: string, subjectDocument?: Tyr.Document): Promise<boolean>;
    $allow(permissionType: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
    $deny(permissionType: string, subjectDocument?: Tyr.Document): Promise<Tyr.Document>;
};
export declare class GraclPlugin {
    verbose: boolean;
    static makeRepository(collection: Tyr.CollectionInstance): gracl.Repository;
    static buildLinkGraph(): Hash<Hash<string>>;
    graclHierarchy: gracl.Graph;
    outgoingLinkPaths: Hash<Hash<string>>;
    constructor(verbose?: boolean);
    log(message: string): this;
    getObjectHierarchy(): {
        subjects: {};
        resources: {};
    };
    getShortestPath(colA: Tyr.CollectionInstance, colB: Tyr.CollectionInstance): string[];
    boot(stage: Tyr.BootStage): void;
    query(queriedCollection: Tyr.CollectionInstance, permissionAction: string, user?: Tyr.Document): Promise<boolean | {}>;
}
