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
var OrganizationBaseCollection = new Tyr.Collection({
    id: 'o00',
    name: 'organization',
    dbName: 'organizations',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        permissions: { link: 'graclPermission' }
    }
});

var Organization = function (_OrganizationBaseColl) {
    (0, _inherits3.default)(Organization, _OrganizationBaseColl);

    function Organization() {
        (0, _classCallCheck3.default)(this, Organization);
        return (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Organization).apply(this, arguments));
    }

    return Organization;
}(OrganizationBaseCollection);

exports.Organization = Organization;