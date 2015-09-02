'use strict';

const cypher = require('../utils/get-mcrypt-cypher.js')();

function decryptUsername(username) {
    return cypher.decrypt(new Buffer(username.trim(), 'base64'))
        .toString().replace(/\0/g, '');
}

module.exports = function(bookshelf) {
    return bookshelf.extend({
        tableName: 'cas_users',
        idAttribute: 'username',
        initialize: function() {
            this.on('saved', this._utils.saveHist, this);
            this.on('fetched', this.decryptAttributes, this);
        },

        decryptAttributes: function() {
            this.set('username', decryptUsername(this.get('username')));
            delete this.attributes.password;
        }
    });
};
