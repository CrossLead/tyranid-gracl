"use strict";
const Tyr = require('tyranid');
const tpmongo = require('tpmongo');
const chai_1 = require('chai');
const _1 = require('../../lib/');
const expectedLinkPaths_1 = require('./expectedLinkPaths');
const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []), root = __dirname.replace(/test\/spec/, '');
const secure = _1.PermissionsModel.getGraclPlugin();
describe('tyranid-gracl', () => {
    before(() => {
        Tyr.config({
            db: db,
            validate: [
                { dir: root + '/test/models', fileMatch: '[a-z].js' },
                { dir: root + '/lib/collections', fileMatch: '[a-z].js' }
            ],
            secure: secure
        });
        secure.boot('post-link');
    });
    it('Tyranid collections should exist', () => {
        chai_1.expect(Tyr.byName['graclPermission']).to.exist;
    });
    it('Cached link paths should be correctly constructed', () => {
        chai_1.expect(secure.shortestLinkPaths).to.deep.equal(expectedLinkPaths_1.default);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlyYW5pZC1ncmFjbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Rlc3Qvc3BlYy90eXJhbmlkLWdyYWNsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFFQSxNQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixNQUFZLE9BQU8sV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUNuQyx1QkFBdUIsTUFBTSxDQUFDLENBQUE7QUFDOUIsbUJBQWlDLFlBQVksQ0FBQyxDQUFBO0FBQzlDLG9DQUE4QixxQkFBcUIsQ0FBQyxDQUFBO0FBRXBELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyw4Q0FBOEMsRUFBRSxFQUFFLENBQUMsRUFDaEUsSUFBSSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBRWpELE1BQU0sTUFBTSxHQUFHLG1CQUFnQixDQUFDLGNBQWMsRUFBRSxDQUFDO0FBRWpELFFBQVEsQ0FBQyxlQUFlLEVBQUU7SUFFeEIsTUFBTSxDQUFDO1FBRUwsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUNULEVBQUUsRUFBRSxFQUFFO1lBQ04sUUFBUSxFQUFFO2dCQUNSLEVBQUUsR0FBRyxFQUFFLElBQUksR0FBRyxjQUFjLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRTtnQkFDckQsRUFBRSxHQUFHLEVBQUUsSUFBSSxHQUFHLGtCQUFrQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUU7YUFDMUQ7WUFDRCxNQUFNLEVBQUUsTUFBTTtTQUNmLENBQUMsQ0FBQztRQUdILE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsa0NBQWtDLEVBQUU7UUFDckMsYUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFDakQsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsbURBQW1ELEVBQUU7UUFDdEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLDJCQUFpQixDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7QUFFTCxDQUFDLENBQUMsQ0FBQyJ9