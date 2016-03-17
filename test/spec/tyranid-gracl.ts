/// <reference path='../../typings/main.d.ts' />
/// <reference path='../test-typings.d.ts'/>

import * as Tyr from 'tyranid';
import * as tpmongo from 'tpmongo';
import { expect } from 'chai';
import { PermissionsModel } from '../../lib/';
import { expectedLinkPaths } from './expectedLinkPaths';
import { createTestData } from './createTestData';

const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
      root = __dirname.replace(/test\/spec/, '');

const secure = PermissionsModel.getGraclPlugin();

describe('tyranid-gracl', () => {

  before(async function() {
    this.timeout(10000);

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


});
