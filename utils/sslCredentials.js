var os = require('os');
var fs = require('fs');
var config = require('config');
var hostnameSSL = os.hostname().split(".");
var certPath, keyPath, bundlePath, chainedCerts, delimiter;
var sslOptions = {};

// use wildcard certs
certPath = config.get('sslCertPath');
keyPath = config.get('sslKeyPath');
bundlePath = config.has('sslBundlePath') ? config.get('sslBundlePath') : undefined;

try {
    if (bundlePath) {
        // generate array of chain certs
        chainedCerts = fs.readFileSync(bundlePath, 'utf8');
        delimiter = chainedCerts.match(/-*END CERTIFICATE-*/)[0];
        sslOptions.ca = chainedCerts.split(delimiter)
            .map(function reConcatDelim(certString){
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
