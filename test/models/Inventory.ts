import Tyr from 'tyranid';

export const InventoryBaseCollection = <Tyr.CollectionInstance> (new Tyr.Collection({
  id: 'i00',
  name: 'inventory',
  dbName: 'inventories',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    items: { is: 'array', of: { is: 'string' } },
    organizationId: {
      link: 'organization',
      relate: 'ownedBy',
      graclType: 'resource'
    }
  }
}));

export class Inventory extends (<Tyr.CollectionInstance> InventoryBaseCollection) {

}
