import * as Tyr from 'tyranid';

export const ChartBaseCollection = new Tyr.Collection({
  id: 'c00',
  name: 'chart',
  dbName: 'charts',
  fields: {
    _id: { is: 'mongoid' },
    name: { is: 'string' },
    organizationId: {
      link: 'organization'
    }
  }
});

export class Chart extends (<Tyr.CollectionInstance> ChartBaseCollection) {

}
