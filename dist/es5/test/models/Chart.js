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
exports.ChartBaseCollection = new Tyr.Collection({
    id: 'c00',
    name: 'chart',
    dbName: 'charts',
    fields: {
        _id: { is: 'mongoid' },
        name: { is: 'string' },
        organizationId: {
            link: 'organization'
        },
        blogId: {
            link: 'blog'
        },
        postIds: {
            is: 'array', of: { link: 'post' }
        },
        teamIds: {
            is: 'array', of: { link: 'team' }
        },
        userIds: {
            is: 'array', of: { link: 'user' }
        }
    }
});

var Chart = function (_exports$ChartBaseCol) {
    (0, _inherits3.default)(Chart, _exports$ChartBaseCol);

    function Chart() {
        (0, _classCallCheck3.default)(this, Chart);
        return (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Chart).apply(this, arguments));
    }

    return Chart;
}(exports.ChartBaseCollection);

exports.Chart = Chart;