'use strict';

var Mcrypt = require('mcrypt').MCrypt;
var config = require('config');
var fs = require('fs');

var cypher = new Mcrypt('rijndael-128', 'ecb');
var dbEncryptionKeyPath = config.get('dbEncryptionKeyPath');
var authKey = fs.readFileSync(dbEncryptionKeyPath).toString().trim();

function getMcryptCypher() {
    return cypher;
}

cypher.open(authKey);

module.exports = getMcryptCypher;