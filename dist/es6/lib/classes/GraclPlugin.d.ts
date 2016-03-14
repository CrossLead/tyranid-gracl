/// <reference path="../../../../typings/main.d.ts" />
import * as Tyr from 'tyranid';
import * as gracl from 'gracl';
export declare type Hash<T> = {
    [key: string]: T;
};
export declare type TyrSchemaGraphObjects = {
    links: Tyr.Field[];
    parents: Tyr.CollectionInstance[];
};
export declare type LinkGraph = {
    [collectionName: string]: Set<string>;
};
export declare function createInQueries(map: Map<string, string[]>, queriedCollection: Tyr.CollectionInstance, key: string): {};
export declare class GraclPlugin {
    verbose: boolean;
    static makeRepository(collection: Tyr.CollectionInstance): gracl.Repository;
    static buildLinkGraph(): Hash<Hash<string>>;
    graclHierarchy: gracl.Graph;
    shortestLinkPaths: Hash<Hash<string>>;
    constructor(verbose?: boolean);
    log(message: string): this;
    getShortestPath(colA: Tyr.CollectionInstance, colB: Tyr.CollectionInstance): string[];
    boot(stage: Tyr.BootStage): void;
    query(queriedCollection: Tyr.CollectionInstance, permissionType: string, user?: Tyr.Document): Promise<boolean | {}>;
}
