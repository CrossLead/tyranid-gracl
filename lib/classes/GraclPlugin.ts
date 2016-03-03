/// <reference path='../../typings/main.d.ts' />
import Tyr from 'tyranid';
import { Subject, Resource } from 'gracl/lib';

// various stages of bootstrap process
type BootStage = 'compile' | 'link' | 'post-link';

// parametric string -> any hash
type Hash<T> = {
  [key: string]: T;
};


const BaseCollection = new Tyr.Collection({
  id: 'gcp',
  name: '_graclPermissions',
  dbName: '_graclPermissions',
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

  setViewAccess(doc: Tyr.Document, access: boolean): Tyr.Document {
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

    const resource = this.resources[collection.def.id],
          subject = this.subjects[user.$model.def.id];

    const subjectId = subject.getId();

    const permissions = await PermissionsModel.find({ });

    return queryObj;
  }

}
