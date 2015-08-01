'use strict';
const Promise = require('bluebird');

// Define plugins
var plugins = [
    require('inject-then'),
    require('hapi-auth-hawk'),
    {
        register: require('hapi-redis'),
        options: require('./get-redis-config.js')(),
        afterRegistration: function promisifyRedisClient(server) {
            var redis = server.plugins['hapi-redis'];
            Promise.promisifyAll(redis.client);
            return;
        }
    },
    {
        register: require('good'),
        options: require('./get-good-config.js')()
    },
    {
        register: require('hapi-bookshelf-models'),
        options: {
            knex: require('./get-knex-config.js')(),
            plugins: ['registry'],
            models: './lib/models/' //relative to root, not this dir
        }
    },
    {
        register: require('./response-formatter.js'),
        options: {
            excludeVarieties: ['view', 'file'],
            excludePlugins: ['hapi-swagger']
        }
    },
    {
        register: require('./register-routes.js'),
        options: { routesPath: 'lib/app-routes' }
    },
    {
        register: require('hapi-swagger'),
        options: {
            apiVersion: require('./../../package.json').version
        }
    }
];

module.exports = () => { return plugins; };
