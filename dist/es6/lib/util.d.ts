/// <reference path="../../../typings/main.d.ts" />
import * as Tyr from 'tyranid';
export declare type Hash<T> = {
    [key: string]: T;
};
export declare const getCollectionLinksSorted: {
    (col: Tyr.CollectionInstance, opts?: any): Tyr.Field[];
    cache: {
        [key: string]: Tyr.Field[];
    };
};
export declare function compareCollectionWithField(aCol: Tyr.CollectionInstance, bCol: Tyr.Field): number;
export declare function findLinkInCollection(col: Tyr.CollectionInstance, linkCollection: Tyr.CollectionInstance): Tyr.Field;
export declare function createInQueries(map: Map<string, Set<string>>, queriedCollection: Tyr.CollectionInstance, key: '$nin' | '$in'): {
    $and?: Hash<Hash<string[]>>[];
    $or?: Hash<Hash<string[]>>[];
};
export declare function stepThroughCollectionPath(ids: string[], previousCollection: Tyr.CollectionInstance, nextCollection: Tyr.CollectionInstance, insecure?: boolean): Promise<string[]>;
