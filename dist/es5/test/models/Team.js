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
var TeamBaseCollection = new Tyr.Collection({
    id: 't00',
    name: 'team',
    dbName: 'teams',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        organizationId: {
            link: 'organization',
            relate: 'ownedBy',
            graclType: 'subject'
        },
        permissionIds: { is: 'array', link: 'graclPermission' }
    }
});

var Team = function (_TeamBaseCollection) {
    (0, _inherits3.default)(Team, _TeamBaseCollection);

    function Team() {
        (0, _classCallCheck3.default)(this, Team);
        return (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Team).apply(this, arguments));
    }

    return Team;
}(TeamBaseCollection);

exports.Team = Team;