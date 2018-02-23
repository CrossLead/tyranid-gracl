import { Tyr } from 'tyranid';

/**
 * The main model for storing individual permission edges
 */
export const GraclPermission = new Tyr.Collection({
  id: '_gp',
  name: 'graclPermission',
  dbName: 'graclPermissions',
  fields: {
    _id: { is: 'mongoid' },
    subjectId: { is: 'uid', required: true },
    resourceId: { is: 'uid', required: true },
    subjectType: { is: 'string', required: true },
    resourceType: { is: 'string', required: true },
    access: {
      is: 'object',
      required: true,
      keys: { is: 'string' },
      of: { is: 'boolean' }
    }
  }
});
