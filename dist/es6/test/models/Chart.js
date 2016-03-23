"use strict";
const Tyr = require('tyranid');
exports.ChartBaseCollection = new Tyr.Collection({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi90ZXN0L21vZGVscy9DaGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsTUFBWSxHQUFHLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFFbEIsMkJBQW1CLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDO0lBQ3BELEVBQUUsRUFBRSxLQUFLO0lBQ1QsSUFBSSxFQUFFLE9BQU87SUFDYixNQUFNLEVBQUUsUUFBUTtJQUNoQixNQUFNLEVBQUU7UUFDTixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1FBQ3RCLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7UUFDdEIsY0FBYyxFQUFFO1lBQ2QsSUFBSSxFQUFFLGNBQWM7U0FDckI7UUFDRCxNQUFNLEVBQUU7WUFDTixJQUFJLEVBQUUsTUFBTTtTQUNiO1FBQ0QsT0FBTyxFQUFFO1lBQ1AsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1NBQ2xDO1FBQ0QsT0FBTyxFQUFFO1lBQ1AsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1NBQ2xDO1FBQ0QsT0FBTyxFQUFFO1lBQ1AsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1NBQ2xDO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFFSCxvQkFBcUQsMkJBQW9CO0FBRXpFLENBQUM7QUFGWSxhQUFLLFFBRWpCLENBQUEifQ==