"use strict";

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Tyr = require('tyranid');
exports.PermissionLockBaseCollection = new Tyr.Collection({
    id: '_gl',
    name: 'graclPermissionLock',
    dbName: 'graclPermissionLocks',
    fields: {
        _id: { is: 'mongoid' },
        resourceId: { is: 'uid' },
        locked: { is: 'boolean' }
    }
});

var PermissionLocks = function (_exports$PermissionLo) {
    (0, _inherits3.default)(PermissionLocks, _exports$PermissionLo);

    function PermissionLocks() {
        (0, _classCallCheck3.default)(this, PermissionLocks);
        return (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(PermissionLocks).apply(this, arguments));
    }

    return PermissionLocks;
}(exports.PermissionLockBaseCollection);

exports.PermissionLocks = PermissionLocks;