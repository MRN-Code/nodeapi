'use strict';

module.exports = function(bookshelf) {
    return bookshelf.extend({
        tableName: 'cas_roles',
        idAttribute: 'role_id',
        user: function() {
            return this.belongsTo('UserStudyRole', 'role_id');
        }
    });
};
