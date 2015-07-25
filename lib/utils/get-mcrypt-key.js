'use strict';

var config = require('config');
var fs = require('fs');

var dbEncryptionKeyPath = config.get('dbEncryptionKeyPath');
var authKey = fs.readFileSync(dbEncryptionKeyPath).toString().trim();

function getMcryptKey() {
    return authKey;
}

module.exports = getMcryptKey;
