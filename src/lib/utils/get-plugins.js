'use strict';
const Bluebird = require('bluebird');
const config = require('config');
const path = require('path');
const pkg = require(path.join(process.cwd(), 'package.json'));
const cliOpts = require('./cli-options.js');
const chalk = require('chalk');
const baseRoutePath = path.join(__dirname, '../app-routes/');

const schema = require(
    path.join(process.cwd(), config.get('permissionsSchemaPath'))
);

const getAppRouteConfig = (relPath, prefix) => {
    const registerConfig = {
        register: require(path.join(baseRoutePath, relPath))
    };

    if (prefix) {
        registerConfig.registrationOptions = {
            routes: {
                prefix: '/' + prefix
            }
        };
    }

    return registerConfig;
};

// Define plugins
var plugins = [
    {
        register: require('good'),
        options: require('./get-good-config.js')()
    },
    require('./global-error-handler.js'),
    require('./register-uncaught-exceptions.js'),
    require('./register-unhandled-rejections.js'),
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
        register: require('./strip-api-url-prefix.js')
    },
    {
        register: require('hapi-bookshelf-models'),
        options: {
            knex: require('./get-knex-config.js')(),
            plugins: ['registry'],
            base: require('./get-base-model.js'),
            models: path.resolve(__dirname, '../models/')
        }
    },
    {
        register: require('hapi-relations'),
        options: {
            schema: schema,
            client: 'hapi-redis',
            clientType: 'redis',
            pluginClient: true
        },
        afterRegistration: function promisifyRelations(server) {
            var relations = server.plugins.relations;
            Bluebird.promisifyAll(relations);
            return;
        }
    },
    {
        register: require('./add-proxy-host-header.js'),
    },
    {
        register: require('./response-formatter.js'),
        options: {
            excludeVarieties: ['view', 'file'],
            excludePlugins: [
                'hapi-swagger',
                'client-source',
                'coinstac-storage-proxy'
            ]
        }
    },
    require('./authentication.js'),
    require('inert'),
    require('vision'),
    {
        register: require('hapi-swagger'),
        options: {
            info: {
                version: pkg.version,
                title: 'COINS API'
            },
            documentationPath: '/swagger/documentation',
            jsonPath: '/swagger/swagger.json',
            swaggerUIPath: '/swagger/swaggerui/',
            pathPrefixSize: 2
        },
        registrationOptions: {
            routes: {
                //prefix: '/api/v' + pkg.version
            }
        }
    },
    getAppRouteConfig('common/auth/keys.js', 'auth'),
    getAppRouteConfig('common/auth/cookies.js', 'auth'),
    getAppRouteConfig('common/users.js'),
    getAppRouteConfig('coins/scans.js'),
    getAppRouteConfig('coins/scan-details.js'),
    {
        register: require('./version-route.js'),
        registrationOptions: {
            routes: {
                prefix: '/api'
            }
        }
    },
    {
        register: require('./client-route.js'),
        registrationOptions: {
            routes: {
                prefix: '/api'
            }
        }
    }
];

if (cliOpts.coinstac) {
    console.log(chalk.blue('Including COINSTAC routes'));
    plugins.push(require('h2o2'));
    plugins.push({
        register: require('coinstac-storage-proxy'),
        options: { targetBaseUrl: config.get('coinstac.storageBaseUrl') }
    });
}

module.exports = () => { return plugins; };
