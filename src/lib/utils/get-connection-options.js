'use strict';

const config = require('config');
const cliOpts = require('./cli-options.js');

/**
 * get connection options for hapi server pack (http and https)
 * @return {object} containing keys for each protocol (http and https)
 */
function getConnectionOptions() {
    return {
        http: {
            labels: ['api'],
            port: parseInt(cliOpts.port, 10) || config.get('httpPort')

        }
    };
}

module.exports = getConnectionOptions;
