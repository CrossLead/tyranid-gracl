/// <reference path='../../typings/main.d.ts' />
/// <reference path="../test-typings.d.ts"/>
import * as Tyr from 'tyranid';
import * as tpmongo from 'tpmongo';
import { expect } from 'chai';

const db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
      root = __dirname.replace(/test\/spec/, '');

describe('tyranid-gracl', () => {

  before(() => {
    Tyr.config({
      db: db,
      validate: [
        { dir: root + '/test/models', fileMatch: '[a-z].js' },
        { dir: root + '/lib/collections', fileMatch: '[a-z].js' }
      ]
    });
  });

  it('Tyranid collections should exist', () => {
    expect(Tyr.collections).to.exist;
  });

});
