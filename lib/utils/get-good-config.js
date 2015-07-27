'use strict';

var config = require('config');

var goodConfig = {
    reporters: [{
        reporter: require('good-console'),
        events:{ log: '*', response: '*' }
    }, {
        reporter: require('good-file'),
        events:{ log: '*', response: '*' },
        config: {
            path: config.get('logPath'),
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
