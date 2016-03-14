"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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
        permissions: { link: 'graclPermission' }
    }
});

var Team = function (_TeamBaseCollection) {
    _inherits(Team, _TeamBaseCollection);

    function Team() {
        _classCallCheck(this, Team);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Team).apply(this, arguments));
    }

    return Team;
}(TeamBaseCollection);

exports.Team = Team;