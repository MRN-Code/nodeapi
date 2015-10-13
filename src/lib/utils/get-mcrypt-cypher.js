'use strict';

const Mcrypt = require('mcrypt').MCrypt;
const config = require('config');
const fs = require('fs');

const cypher = new Mcrypt('rijndael-128', 'ecb');
const dbEncryptionKeyPath = config.get('dbEncryptionKeyPath');
const authKey = fs.readFileSync(dbEncryptionKeyPath).toString().trim();

function getMcryptCypher() {
    return cypher;
}

cypher.open(authKey);

module.exports = getMcryptCypher;
