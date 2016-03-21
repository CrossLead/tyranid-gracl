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
      .setPermissionAccess(chipotle, 'view-post', true, ben);

    const existingPermissions = await tyranidGracl.PermissionsModel.find({}, null, { tyranid: { insecure: true } });

    expect(existingPermissions).to.have.lengthOf(1);
    expect(existingPermissions[0]['resourceId'].toString(), 'resourceId')
      .to.equal(updatedChipotle['permissions'][0]['resourceId'].toString());
    expect(existingPermissions[0]['subjectId'].toString(), 'subjectId')
      .to.equal(updatedChipotle['permissions'][0]['subjectId'].toString());
    expect(existingPermissions[0]['access']['view-post'], 'access')
      .to.equal(updatedChipotle['permissions'][0]['access']['view-post']);
  });



  it('Permissions hierarchy should be respected', async() => {
    const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
          chipotleFoodBlog = await Tyr.byName['blog'].findOne({ name: 'Burritos Etc' });

    expect(ben, 'ben should exist').to.exist;
    expect(chipotleFoodBlog, 'chipotleFoodBlog should exist').to.exist;

    expect(
      await chipotleFoodBlog['$isAllowed']('view-post', ben),
      'ben should have access to chipotleFoodBlog through access to chipotle org'
    ).to.equal(true);
  });


  it('Collection.find() should be appropriately filtered based on permissions', async() => {
    const ben = await Tyr.byName['user'].findOne({ name: 'ben' });
  });



  it('Permissions should be validated', async() => {
    const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
          chipotleCorporateBlog = await Tyr.byName['blog'].findOne({ name: 'Mexican Empire' });

    expect(ben, 'ben should exist').to.exist;
    expect(chipotleCorporateBlog, 'chipotleCorporateBlog should exist').to.exist;

    let threw = false,
        message = '';
    try {
      await chipotleCorporateBlog['$isAllowed']('view', ben);
    } catch (err) {
      threw = true;
      message = err.message;
    }

    expect(threw,
      'checking \"view\" without collection should throw'
    ).to.equal(true);

    expect(message, `Error message should contain \"No collection name in permission type\"`)
      .to.match(/No collection name in permission type/g);
  });



});
