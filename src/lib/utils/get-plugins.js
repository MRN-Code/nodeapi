'use strict';
const Bluebird = require('bluebird');
const config = require('config');
const path = require('path');
const pkg = require(path.join(process.cwd(), 'package.json'));
const cliOpts = require('./cli-options.js');
const chalk = require('chalk');
const baseRoutePrefix = '/api/v' + pkg.version;
const baseRoutePath = path.join(__dirname, '../app-routes/');

const schema = require(
    path.join(process.cwd(), config.get('permissionsSchemaPath'))
);

const getAppRouteConfig = (relPath, prefix) => {
    let routePrefix = baseRoutePrefix;
    if (prefix) {
        routePrefix = path.join(baseRoutePrefix, prefix);
    }

    return {
        register: require(path.join(baseRoutePath, relPath)),
        registrationOptions: {
            routes: {
                prefix: routePrefix
            }
        }
    };
};

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
    getAppRouteConfig('common/auth/keys.js', 'auth'),
    getAppRouteConfig('common/auth/cookies.js', 'auth'),
    getAppRouteConfig('common/users.js'),
    getAppRouteConfig('coins/scans.js'),
    getAppRouteConfig('coins/studies.js'),
    {
        register: require('./version-route.js'),
        registrationOptions: {
            routes: {
                prefix: '/api'
            }
        }
    }
];

if (cliOpts.coinstac) {
    console.log(chalk.blue('Including COINSTAC routes'));
    plugins.push({
        register: require('./houchdb.js'),
        options: config.get('coinstac.pouchdb.consortiaMeta')
    });
    plugins.push(getAppRouteConfig('coinstac/consortia.js', 'coinstac'));
}

module.exports = () => { return plugins; };
