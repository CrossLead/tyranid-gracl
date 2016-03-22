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
      secure: secure,
      cls: false
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
          chopped = await Tyr.byName['organization'].findOne({ name: 'Chopped' });

    expect(ben, 'ben should exist').to.exist;
    expect(chopped, 'chopped should exist').to.exist;

    const updatedChopped = await tyranidGracl
      .PermissionsModel
      .setPermissionAccess(chopped, 'view-post', true, ben);

    const existingPermissions = await tyranidGracl.PermissionsModel.find({}, null, { tyranid: { insecure: true } });

    expect(existingPermissions).to.have.lengthOf(1);
    expect(existingPermissions[0]['resourceId'].toString(), 'resourceId')
      .to.equal(updatedChopped['permissions'][0]['resourceId'].toString());
    expect(existingPermissions[0]['subjectId'].toString(), 'subjectId')
      .to.equal(updatedChopped['permissions'][0]['subjectId'].toString());
    expect(existingPermissions[0]['access']['view-post'], 'access')
      .to.equal(updatedChopped['permissions'][0]['access']['view-post']);
  });



  it('Permissions hierarchy should be respected', async() => {
    const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
          choppedBlog = await Tyr.byName['blog'].findOne({ name: 'Salads are great' });

    expect(ben, 'ben should exist').to.exist;
    expect(choppedBlog, 'choppedBlog should exist').to.exist;

    expect(
      await choppedBlog['$isAllowed']('view-post', ben),
      'ben should have access to choppedBlog through access to chopped org'
    ).to.equal(true);
  });


  it('Collection.find() should be appropriately filtered based on permissions', async() => {
    const ben = await Tyr.byName['user'].findOne({ name: 'ben' }),
          ted = await Tyr.byName['user'].findOne({ name: 'ted' });

    Tyr.local.user = ben;

    console.log(`finding all posts with ben as user`);
    const postsBenCanSee = await Tyr.byName['post'].find({});

    Tyr.local.user = ted;

    console.log(`finding all posts with ted as user`);
    const postsTedCanSee = await Tyr.byName['post'].find({});

    console.log(postsBenCanSee, postsTedCanSee);
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
