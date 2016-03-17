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
var UserBaseCollection = new Tyr.Collection({
    id: 'u00',
    name: 'user',
    dbName: 'users',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        teamIds: {
            is: 'array',
            of: {
                link: 'team',
                relate: 'ownedBy',
                graclType: 'subject'
            }
        },
        organizationId: { link: 'organization' },
        permissions: { link: 'graclPermission' }
    }
});

var User = function (_UserBaseCollection) {
    (0, _inherits3.default)(User, _UserBaseCollection);

    function User() {
        (0, _classCallCheck3.default)(this, User);
        return (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(User).apply(this, arguments));
    }

    return User;
}(UserBaseCollection);

exports.User = User;