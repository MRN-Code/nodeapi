'use strict';

var config = require('config');

var httpsOptions = {
    labels: ['https'],
    port: config.get('httpsPort')
};
var httpOptions = {
    labels: ['http'],
    port: config.get('httpPort')
};
if (config.has('sslCertPath')) {
    httpsOptions.tls = require('./get-ssl-credentials.js')();
}

/**
 * get connection options for hapi server pack (http and https)
 * @return {object} containing keys for each protocol (http and https)
 */
function getConnectionOptions() {
    return {
        http: httpOptions,
        https: httpsOptions
    };
}

module.exports = getConnectionOptions;
