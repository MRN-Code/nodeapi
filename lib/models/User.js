'use strict';

var Mcrypt = require('mcrypt').MCrypt;
var cypher = new Mcrypt('rijndael-128', 'ecb');

// it is OK to do this Sync because this
// should be included before server is ready
var key = require('./../utils/get-mcrypt-key.js')();
cypher.open(key);

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
