'use strict';

module.exports = (bookshelf) => {
    return bookshelf.extend({
        tableName: 'casdba.cas_study_user_role_privs'
    });
};
