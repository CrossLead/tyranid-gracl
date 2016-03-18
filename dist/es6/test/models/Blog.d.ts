import * as Tyr from 'tyranid';
import { Post } from './Post';
export declare const BlogBaseCollection: Tyr.CollectionInstance;
export declare class Blog extends  {
    static addPost(text: string, blog: Tyr.Document): Promise<Post>;
}
