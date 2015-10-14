'use strict';

const config = require('config');

/**
 * get connection options for hapi server pack (http and https)
 * @return {object} containing keys for each protocol (http and https)
 */
function getConnectionOptions() {
    return {
        http: {
            labels: ['api'],
            port: config.get('httpPort')

        }
    };
}

module.exports = getConnectionOptions;
