import Tyr from 'tyranid';
import { Repository, Node } from 'gracl';


export function makeRepository(collection: Tyr.CollectionInstance, graclType: string): Repository {
  if (graclType !== 'resource' && graclType !== 'subject') {
    throw new TypeError(`graclType must be subject or resource, given ${graclType}`);
  }
  return {

    getEntity(id: string, node: Node): Promise<Tyr.Document> {
      return collection.byId(id);
    },

    saveEntity(id: string, doc: Tyr.Document, node: Node): Promise<Tyr.Document> {
      return doc.$save();
    }

  };
}
