"use strict";
const Tyr = require('tyranid');
const OrganizationBaseCollection = new Tyr.Collection({
    id: 'o00',
    name: 'organization',
    dbName: 'organizations',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        permissions: { link: 'graclPermission' }
    }
});
class Organization extends OrganizationBaseCollection {
}
exports.Organization = Organization;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3JnYW5pemF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vdGVzdC9tb2RlbHMvT3JnYW5pemF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUUvQixNQUFNLDBCQUEwQixHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQztJQUNwRCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxjQUFjO0lBQ3BCLE1BQU0sRUFBRSxlQUFlO0lBQ3ZCLE1BQU0sRUFBRTtRQUNOLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7UUFDdEIsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtRQUN0QixXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7S0FDekM7Q0FDRixDQUFDLENBQUM7QUFFSCwyQkFBNEQsMEJBQTJCO0FBRXZGLENBQUM7QUFGWSxvQkFBWSxlQUV4QixDQUFBIn0=