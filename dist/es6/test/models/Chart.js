"use strict";
const tyranid_1 = require('tyranid');
exports.ChartBaseCollection = new tyranid_1.default.Collection({
    id: 'c00',
    name: 'chart',
    dbName: 'charts',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        organizationId: {
            link: 'organization'
        },
        blogId: {
            link: 'blog'
        },
        postIds: {
            is: 'array', of: { link: 'post' }
        },
        teamIds: {
            is: 'array', of: { link: 'team' }
        },
        userIds: {
            is: 'array', of: { link: 'user' }
        }
    }
});
class Chart extends exports.ChartBaseCollection {
}
exports.Chart = Chart;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L21vZGVscy9DaGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMEJBQWdCLFNBQVMsQ0FBQyxDQUFBO0FBRWIsMkJBQW1CLEdBQUcsSUFBSSxpQkFBRyxDQUFDLFVBQVUsQ0FBQztJQUNwRCxFQUFFLEVBQUUsS0FBSztJQUNULElBQUksRUFBRSxPQUFPO0lBQ2IsTUFBTSxFQUFFLFFBQVE7SUFDaEIsTUFBTSxFQUFFO1FBQ04sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRTtRQUN0QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO1FBQ3RCLGNBQWMsRUFBRTtZQUNkLElBQUksRUFBRSxjQUFjO1NBQ3JCO1FBQ0QsTUFBTSxFQUFFO1lBQ04sSUFBSSxFQUFFLE1BQU07U0FDYjtRQUNELE9BQU8sRUFBRTtZQUNQLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtTQUNsQztRQUNELE9BQU8sRUFBRTtZQUNQLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtTQUNsQztRQUNELE9BQU8sRUFBRTtZQUNQLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtTQUNsQztLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsb0JBQXFELDJCQUFvQjtBQUV6RSxDQUFDO0FBRlksYUFBSyxRQUVqQixDQUFBIn0=