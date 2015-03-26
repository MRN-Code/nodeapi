'use strict';

module.exports = function (bookshelf) {
    return bookshelf.Model.extend({
        tableName: 'casdba.cas_study_user_role_privs_vw'
    });
}; 
