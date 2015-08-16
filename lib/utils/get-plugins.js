'use strict';
const Bluebird = require('bluebird');
const fs = require('fs');
const config = require('config');

const schema = JSON.parse(
    fs.readFileSync(config.get('permissionsSchemaPath'), 'utf8')
);

// Define plugins
var plugins = [
    require('inject-then'),
    require('hapi-auth-hawk'),
    {
        register: require('hapi-redis'),
        options: require('./get-redis-config.js')(),
        afterRegistration: function promisifyRedisClient(server) {
            var redis = server.plugins['hapi-redis'];
            Bluebird.promisifyAll(redis.client);
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
        register: require('hapi-relations'),
        options: {
            schema: schema,
            client: 'hapi-redis',
            clientType: 'redis',
            pluginClient: true
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
        register: require('hapi-swagger'),
        options: {
            apiVersion: require('./../../package.json').version
        }
    },
    {
        register: require('./register-routes.js'),
        options: { routesPath: 'lib/app-routes' }
    }
];

module.exports = () => { return plugins; };
