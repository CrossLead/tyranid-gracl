/// <reference path="../../../../typings/main.d.ts" />
import * as Tyr from 'tyranid';
import * as gracl from 'gracl';
import { Hash } from '../util';
export declare class GraclPlugin {
    verbose: boolean;
    static makeRepository(collection: Tyr.CollectionInstance): gracl.Repository;
    static buildLinkGraph(): Hash<Hash<string>>;
    graclHierarchy: gracl.Graph;
    outgoingLinkPaths: Hash<Hash<string>>;
    constructor(verbose?: boolean);
    log(message: string): this;
    getShortestPath(colA: Tyr.CollectionInstance, colB: Tyr.CollectionInstance): string[];
    boot(stage: Tyr.BootStage): void;
    query(queriedCollection: Tyr.CollectionInstance, permissionType: string, user?: Tyr.Document): Promise<boolean | {}>;
}
