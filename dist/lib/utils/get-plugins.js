'use strict';
var Bluebird = require('bluebird');
var fs = require('fs');
var config = require('config');
var pkg = require('./../../package.json');
var cliOpts = require('./cli-options.js');
var path = require('path');
var chalk = require('chalk');
var baseRoutePrefix = '/api/v' + pkg.version;
var baseRoutePath = './lib/app-routes/';

var schema = JSON.parse(fs.readFileSync(config.get('permissionsSchemaPath'), 'utf8'));

var getAppRouteConfig = function getAppRouteConfig(relPath, prefix) {
    var routePrefix = baseRoutePrefix;
    if (prefix) {
        routePrefix = path.join(baseRoutePrefix, prefix);
    }

    return {
        register: require(path.join(process.cwd(), baseRoutePath, relPath)),
        registrationOptions: {
            routes: {
                prefix: routePrefix
            }
        }
    };
};

// Define plugins
var plugins = [require('inject-then'), require('hapi-auth-hawk'), {
    register: require('hapi-redis'),
    options: require('./get-redis-config.js')(),
    afterRegistration: function promisifyRedisClient(server) {
        var redis = server.plugins['hapi-redis'];
        Bluebird.promisifyAll(redis.client);
        return;
    }
}, {
    register: require('good'),
    options: require('./get-good-config.js')()
}, {
    register: require('hapi-bookshelf-models'),
    options: {
        knex: require('./get-knex-config.js')(),
        plugins: ['registry'],
        base: require('./get-base-model.js'),
        models: './lib/models/' //relative to root, not this dir
    }
}, {
    register: require('hapi-relations'),
    options: {
        schema: schema,
        client: 'hapi-redis',
        clientType: 'redis',
        pluginClient: true
    }
}, {
    register: require('./response-formatter.js'),
    options: {
        excludeVarieties: ['view', 'file'],
        excludePlugins: ['hapi-swagger']
    }
}, require('./authentication.js'), require('inert'), require('vision'), {
    register: require('hapi-swagger'),
    options: {
        apiVersion: pkg.version
    },
    registrationOptions: {
        routes: {
            prefix: '/api/v' + pkg.version
        }
    }
}, getAppRouteConfig('common/auth/keys.js', 'auth'), getAppRouteConfig('common/auth/cookies.js', 'auth'), getAppRouteConfig('common/users.js'), getAppRouteConfig('coins/scans.js'), {
    register: require('./version-route.js'),
    registrationOptions: {
        routes: {
            prefix: '/api'
        }
    }
}];

if (cliOpts.coinstac) {
    console.log(chalk.blue('Including COINSTAC routes'));
    plugins.push({
        register: require('./houchdb.js'),
        options: config.get('coinstac.pouchdb.consortiaMeta')
    });
    plugins.push(getAppRouteConfig('coinstac/consortia.js', 'coinstac'));
}

module.exports = function () {
    return plugins;
};