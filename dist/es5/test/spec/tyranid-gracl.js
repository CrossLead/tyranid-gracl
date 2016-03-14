"use strict";

var Tyr = require('tyranid');
var tpmongo = require('tpmongo');
var chai_1 = require('chai');
var _1 = require('../../lib/');
var expectedLinkPaths_1 = require('./expectedLinkPaths');
var db = tpmongo('mongodb://127.0.0.1:27017/tyranid_gracl_test', []),
    root = __dirname.replace(/test\/spec/, '');
var secure = _1.PermissionsModel.getGraclPlugin();
describe('tyranid-gracl', function () {
    before(function () {
        Tyr.config({
            db: db,
            validate: [{ dir: root + '/test/models', fileMatch: '[a-z].js' }, { dir: root + '/lib/collections', fileMatch: '[a-z].js' }],
            secure: secure
        });
        secure.boot('post-link');
    });
    it('Tyranid collections should exist', function () {
        chai_1.expect(Tyr.byName['graclPermission']).to.exist;
    });
    it('Cached link paths should be correctly constructed', function () {
        var checkPair = function checkPair(a, b) {
            chai_1.expect(secure.getShortestPath(Tyr.byName[a.toLowerCase()], Tyr.byName[b.toLowerCase()])).to.deep.equal(expectedLinkPaths_1.default[a][b] || []);
        };
        checkPair('Post', 'Blog');
        checkPair('Blog', 'Organization');
        checkPair('User', 'Organization');
    });
});