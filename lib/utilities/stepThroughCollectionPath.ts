import Tyr from 'tyranid';
import * as _ from 'lodash';
import { findLinkInCollection } from './findLinkInCollection';
import { createError } from './createError';

/**
 *  Given collections A and B and an array of object ids of documents from A (A-Ids),
    find the ids of all documents in B linked to A by <A-Ids>
 */
export async function stepThroughCollectionPath(
                        ids: string[],
                        previousCollection: Tyr.CollectionInstance,
                        nextCollection: Tyr.CollectionInstance,
                        secure: boolean = false
                      ) {

  // find the field in the current path collection which we need to get
  // for the ids of the next path collection
  const nextCollectionLinkField = findLinkInCollection(nextCollection, previousCollection);

  if (!nextCollectionLinkField) {
    createError(
      `cannot step through collection path, as no link to collection ${nextCollection.def.name} ` +
      `from collection ${previousCollection.def.name}`
    );
  }

  const nextCollectionId = nextCollection.def.primaryKey.field;

  // get the objects in the second to last collection of the path using
  // the ids of the last collection in the path
  const nextCollectionDocs = await nextCollection.findAll(
    { [nextCollectionLinkField.spath]: { $in: ids } },
    { _id: 1, [nextCollectionId]: 1 },
    { tyranid: { secure } }
  );

  // extract their primary ids using the primary field
  return <string[]> _.map(nextCollectionDocs, nextCollectionId);
}
