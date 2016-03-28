"use strict";

const tyranid_1 = require('tyranid');
exports.InventoryBaseCollection = new tyranid_1.default.Collection({
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
        graclResourcePermissionIds: { is: 'array', link: 'graclPermission' }
    }
});
class Inventory extends exports.InventoryBaseCollection {}
exports.Inventory = Inventory;