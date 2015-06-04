var config = require('config');
var mcrypt = require('mcrypt').MCrypt;
var cypher = new mcrypt('rijndael-128', 'ecb');
cypher.open(config.userMcryptKey);


module.exports = function(bookshelf) {
    return bookshelf.extend({
        tableName: 'cas_users_vw',
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
