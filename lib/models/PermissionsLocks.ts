/// <reference path='../../typings/main.d.ts' />
import Tyr from 'tyranid';


export const PermissionLockBaseCollection = new Tyr.Collection({
  id: '_gl',
  name: 'graclPermissionLock',
  dbName: 'graclPermissionLocks',
  fields: {
    _id: { is: 'mongoid' },
    resourceId: { is: 'uid' },
    locked: { is: 'boolean' }
  }
});


export class PermissionLocks extends (<Tyr.CollectionInstance> PermissionLockBaseCollection) {}
