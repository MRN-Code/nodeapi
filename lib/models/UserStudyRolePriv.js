'use strict';

module.exports = function (baseModel, bookshelf) {
    return baseModel.extend({
        tableName: 'casdba.cas_study_user_role_privs_vw'
    });
};
