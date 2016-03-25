import Tyr from 'tyranid';

export const InventoryBaseCollection = new Tyr.Collection({
  id: 'i00',
  name: 'inventory',
  dbName: 'inventories',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    items: { is: 'array', of: 'string' },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclType: 'resource'
    },
    permissionIds: { is: 'array', link: 'graclPermission' }
  }
});

export class Inventory extends (<Tyr.CollectionInstance> InventoryBaseCollection) {

}
