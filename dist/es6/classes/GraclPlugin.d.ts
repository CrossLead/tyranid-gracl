/// <reference path="../../../typings/main.d.ts" />
import Tyr from 'tyranid';
import { Graph } from 'gracl';
export declare type BootStage = 'compile' | 'link' | 'post-link';
export declare type Hash<T> = {
    [key: string]: T;
};
export declare type TyrSchemaGraphObjects = {
    links: Tyr.Field[];
    parents: Tyr.CollectionInstance[];
};
export declare class GraclPlugin {
    static makeRepository(collection: Tyr.CollectionInstance): {
        getEntity(id: string): Promise<Tyr.Document>;
        saveEntity(id: string, doc: Tyr.Document): Promise<Tyr.Document>;
    };
    graph: Graph;
    boot(stage: BootStage): void;
    query(collection: Tyr.CollectionInstance, permission: string, user?: Tyr.Document): Promise<boolean | {}>;
}
