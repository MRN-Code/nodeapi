'use strict';

var os = require('os');
var fs = require('fs');
var config = require('config');
var hostnameSSL = os.hostname().split('.');
var chainedCerts;
var delimiter;
var sslOptions = {};

// use wildcard certs
var certPath = config.get('sslCertPath');
var keyPath = config.get('sslKeyPath');
var bundlePath = config.has('sslBundlePath') ? config.get('sslBundlePath') : undefined;

try {
    if (bundlePath) {
        // generate array of chain certs
        chainedCerts = fs.readFileSync(bundlePath, 'utf8');
        delimiter = chainedCerts.match(/-*END CERTIFICATE-*/)[0];
        sslOptions.ca = chainedCerts.split(delimiter)
            .map(function reConcatDelim(certString) {
                return certString + delimiter;
            });
    }
    sslOptions.key = fs.readFileSync(keyPath, 'utf8');
    sslOptions.cert = fs.readFileSync(certPath, 'utf8');
}
catch (err) {
    console.dir(err);
    throw new Error ('Error parsing chain certificate file');
}

module.exports = sslOptions;
