'use strict';


module.exports = (bookshelf) => {
    return bookshelf.extend({
        tableName: 'casdba.cas_study_user_role_privs',
        idAttribute: ['username', 'role_id', 'study_id'],
        role: function() {
            return this.belongsTo('CasRole', 'role_id');
        },
        initialize: function() {
            this.on('fetched', this.decryptAttributes);
        },

        decryptAttributes: function() {
            this.set('username',
                cypher.decrypt(new Buffer(this.get('username'), 'base64'))
                    .toString().replace(/\0/g, '')
            );
        }
    });
};
