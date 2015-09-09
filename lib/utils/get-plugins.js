'use strict';
const Bluebird = require('bluebird');
const fs = require('fs');
const config = require('config');
const pkg = require('./../../package.json');

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
            base: require('./get-base-model.js'),
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
    require('./authentication.js'),
    require('inert'),
    require('vision'),
    {
        register: require('hapi-swagger'),
        options: {
            apiVersion: pkg.version
        },
        registrationOptions: {
            routes: {
                prefix: '/api/v' + pkg.version
            }
        }
    },
    {
        register: require('./houchdb.js'),
        options: config.get('coinstac.couchdb.consortiaMeta')
    },
    {
        register: require('./register-routes.js'),
        options: { routesPath: 'lib/app-routes' },
        registrationOptions: {
            routes: {
                prefix: '/api/v' + pkg.version
            }
        }
    },
    {
        register: require('./version-route.js'),
        registrationOptions: {
            routes: {
                prefix: '/api'
            }
        }
    }
];

module.exports = () => { return plugins; };
