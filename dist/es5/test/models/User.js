"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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
    _inherits(User, _UserBaseCollection);

    function User() {
        _classCallCheck(this, User);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(User).apply(this, arguments));
    }

    return User;
}(UserBaseCollection);

exports.User = User;