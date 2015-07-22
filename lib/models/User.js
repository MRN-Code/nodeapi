var config = require('config');
var fs = require('fs');
var mcrypt = require('mcrypt').MCrypt;
var cypher = new mcrypt('rijndael-128', 'ecb');
cypher.open(fs.readFileSync('/coins/keys/mcrypt_auth_key').toString().trim());


module.exports = function(bookshelf) {
    return bookshelf.extend({
        tableName: 'cas_users',
        initialize: function() {
            this.on('fetched', this.decryptAttributes);
        },
        decryptAttributes: function(model) {
            this.set('username',
                cypher.decrypt(new Buffer(this.get('username'), 'base64')).toString().replace(/\0/g, '')
            );
        }
    });
};
