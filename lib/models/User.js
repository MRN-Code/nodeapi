'use strict';

var Mcrypt = require('mcrypt').MCrypt;
var cypher = new Mcrypt('rijndael-128', 'ecb');

// it is OK to do this Sync because this
// should be included before server is ready
var key = require('./../utils/get-mcrypt-key.js')();
cypher.open(key);

module.exports = function(bookshelf) {
    return bookshelf.extend({
        tableName: 'cas_users',
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
