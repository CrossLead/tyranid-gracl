/// <reference path='../../typings/main.d.ts' />
/// <reference path='../test-typings.d.ts'/>
import * as Tyr from 'tyranid';
import * as tpmongo from 'tpmongo';
import * as _ from 'lodash';
import * as tyranidGracl from '../../lib/index';
import { expect } from 'chai';
import { expectedLinkPaths } from './expectedLinkPaths';
import { createTestData } from './createTestData';


const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
      root = __dirname.replace(/test\/spec/, ''),
      secure = new tyranidGracl.GraclPlugin();


describe('tyranid-gracl', () => {

  before(async function() {
    secure.verbose = true;

    Tyr.config({
      db: db,
      validate: [
        { dir: root + '/test/models', fileMatch: '[a-z].js' },
        { dir: root + '/lib/models', fileMatch: '[a-z].js' }
      ],
      secure: secure
    });

    await createTestData();
  });


  it('Cached link paths should be correctly constructed', () => {
    for (const a in expectedLinkPaths) {
      for (const b in expectedLinkPaths[a]) {
        expect(secure.getShortestPath(Tyr.byName[a], Tyr.byName[b]), `Path from ${a} to ${b}`)
          .to.deep.equal(expectedLinkPaths[a][b] || []);
      }
    }
  });


  it('Adding permissions should work', async() => {
    const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
          chipotle = await Tyr.byName['organization'].findOne({ name: 'Chipotle' });

    expect(ben, 'ben should exist').to.exist;
    expect(chipotle, 'chipotle should exist').to.exist;

    const updatedChipotle = await tyranidGracl
      .PermissionsModel
      .setPermission(chipotle, 'view-post', true, ben);
  });


});
