import Tyr from 'tyranid';
import { Subject, Resource } from 'gracl/lib/index.ts';


type BootStage = 'compile' | 'link' | 'post-link';
type Hash<T> = { [key: string]: T; };


const BaseCollection = new Tyr.Collection({
  id: 'gcp',
  name: 'graclPermission',
  dbName: 'graclPermissions',
  fields: {
    subjectId: { is: 'uid' },
    resourceId: { is: 'resourceId'},
    subjectType: { is: 'string' },
    resourceType: { is: 'string' },
    access: {
      is: 'object',
      keys: { is: 'string' },
      of: { is: 'boolean '}
    }
  }
});


export class PermissionsModel extends BaseCollection {

  setAccess(doc: Tyr.Document, access: boolean): Tyr.Document {
    // manage permissions
    return doc;
  }

}


export class GraclPlugin {


  resources: Hash<Resource> = {};
  subjects: Hash<Subject> = {};


  boot(stage: BootStage) {
    if (stage === 'post-link') {
      const collections = Tyr.collections;

      // build graph from collections
      // create class hierarchy from graph

    }
  }


  /**
   *  Method for creating a specific query based on a schema object
   */
  async query(collection: Tyr.CollectionInstance, permission: string): Promise<any> {
    const user = Tyr.local.user,
          queryObj = {};

    // if no user, no restriction...
    if (!user) return queryObj;

    // extract subject and resource Gracl classes
    const resource = this.resources[collection.def.id],
          subject = this.subjects[user.$model.def.id];

    // get list of all ids in the subject and resource hierarchies,
    // as well as the names of the subject and resource classes
    const subjectHierarchyIds = await subject.getHierarchyIds(),
          resourceHierarchyIds = await resource.getHierarchyIds(),
          subjectType = subject.getName(),
          resourceType = resource.getName();

    const permissions = await PermissionsModel.find({
      subjectId: { $in: subjectHierarchyIds },
      resourceId: { $in: resourceHierarchyIds },
      resourceType,
      subjectType
    });

    // with array of permissions, determine what types each uid is, and then
    // create restrictions if that type is present on <collection>
    // NOTE: -- do we need organizationId on everything then? or should this automatically
    // recurse down the chain to determine what groups are within an organization and do a diff?

    return queryObj;
  }


}
