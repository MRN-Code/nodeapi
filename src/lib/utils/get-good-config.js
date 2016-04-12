'use strict';

var config = require('config');
const path = require('path');

var goodConfig = {
    reporters: [{
        reporter: require('good-console'),
        events:{ log: '*', request: '*', response: '*' }
    }, {
        reporter: require('good-file'),
        events:{ log: '*', request: '*', response: '*' },
        config: {
            path: path.resolve(__dirname, '../../../', config.get('logPath')),
            prefix: 'node',
            rotate: 'daily'
        }
    }]
};

/**
 * get options for good logging module
 * @return {object} config options for good logging module
 */
function getGoodConfig() {
    return goodConfig;
}

module.exports = getGoodConfig;
