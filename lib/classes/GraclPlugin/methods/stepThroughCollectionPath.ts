import Tyr from 'tyranid';
import * as _ from 'lodash';
import { GraclPlugin } from '../';


export async function stepThroughCollectionPath(
  ids: string[],
  previousCollection: Tyr.CollectionInstance,
  nextCollection: Tyr.CollectionInstance,
  secure: boolean = false
) {
  const plugin = <GraclPlugin> this;

  // find the field in the current path collection which we need to get
  // for the ids of the next path collection
  const nextCollectionLinkField = plugin.findLinkInCollection(nextCollection, previousCollection);

  if (!nextCollectionLinkField) {
    plugin.error(
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
