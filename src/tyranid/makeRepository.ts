import Tyr from 'tyranid';
import { Repository, Node } from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';

export function makeRepository(
  plugin: GraclPlugin,
  collection: Tyr.CollectionInstance,
  graclType: string
): Repository {
  if (graclType !== 'resource' && graclType !== 'subject') {
    plugin.error(`graclType must be subject or resource, given ${graclType}`);
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
