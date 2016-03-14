/// <reference path='../../typings/main.d.ts' />
/// <reference path='../test-typings.d.ts'/>
import * as Tyr from 'tyranid';
import * as tpmongo from 'tpmongo';
import { expect } from 'chai';
import { PermissionsModel } from '../../lib/';
import expectedLinkPaths from './expectedLinkPaths';

const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
      root = __dirname.replace(/test\/spec/, '');

const secure = PermissionsModel.getGraclPlugin();

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

    // hack -- manually call boot now
    secure.boot('post-link');
  });

  it('Tyranid collections should exist', () => {
    expect(Tyr.byName['graclPermission']).to.exist;
  });

  it('Cached link paths should be correctly constructed', () => {
    expect(secure.shortestLinkPaths).to.deep.equal(expectedLinkPaths);
  });

});
