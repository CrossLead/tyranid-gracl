import { Tyr } from 'tyranid';
import { ObjectID } from 'mongodb';
import { Repository } from 'gracl';
import { GraclPlugin } from '../classes/GraclPlugin';


/**
 *
 * Creates a repository aligning with the separate `gracl` library's Repository interface
 * (see: https://github.com/CrossLead/gracl/blob/master/lib/interfaces.ts) to be used
 * when creating the gracl Graph object
 * (see https://github.com/CrossLead/gracl/blob/master/lib/classes/Graph.ts)
 *
 */
export function makeRepository(
  plugin: GraclPlugin,
  collection: Tyr.CollectionInstance,
  graclType: string
): Repository {
  if (graclType !== 'resource' && graclType !== 'subject') {
    plugin.error(`graclType must be subject or resource, given ${graclType}`);
  }
  return {

    getEntity(id: ObjectID): Promise<Tyr.Document> {
      return collection.byId(id);
    },

    saveEntity(id: ObjectID, doc: Tyr.Document): Promise<Tyr.Document> {
      id; // TODO: hack for no unused params...
      return doc.$save();
    }

  };
}
