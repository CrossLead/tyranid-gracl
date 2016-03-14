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
export declare const collectionLinkCache: Hash<Tyr.Field[]>;
export declare function getCollectionLinks(collection: Tyr.CollectionInstance, linkParams: any): Tyr.Field[];
export declare function createInQueries(map: Map<string, string[]>, queriedCollection: Tyr.CollectionInstance, key: string): {};
export declare class GraclPlugin {
    verbose: boolean;
    static makeRepository(collection: Tyr.CollectionInstance): gracl.Repository;
    static buildLinkGraph(): Hash<Hash<string[]>>;
    graclHierarchy: gracl.Graph;
    shortestLinkPaths: Hash<Hash<string[]>>;
    constructor(verbose?: boolean);
    log(message: string): this;
    boot(stage: Tyr.BootStage): void;
    query(queriedCollection: Tyr.CollectionInstance, permissionType: string, user?: Tyr.Document): Promise<boolean | {}>;
}
