'use strict';

const cypher = require('../utils/get-mcrypt-cypher.js')();

function decryptUsername(username) {
  return cypher.decrypt(new Buffer(username.trim(), 'base64'))
        .toString().replace(/\0/g, '');
}

module.exports = (bookshelf) => {
  return bookshelf.extend({
    tableName: 'casdba.cas_study_user_role_privs',
    idAttribute: ['username', 'role_id', 'study_id'],
    role: function () {
      return this.belongsTo('CasRole', 'role_id');
    },

    initialize: function () {
      this.on('saved', this._utils.saveHist, this);
      this.on('fetched', this.decryptAttributes);
    },

    decryptAttributes: function () {
      this.set('username', decryptUsername(this.get('username')));
    }
  });
};
