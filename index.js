'use strict';

var hapi = require('hapi');
var config = require('config');

var knexConfig = require('./lib/utils/get-knex-config.js')();
var goodConfig = require('./lib/utils/get-good-config.js')();
var redisConfig = require('./lib/utils/get-redis-config.js')();
var connectionConfig = require('./lib/utils/get-connection-options.js')();
var mcryptAuthKey = require('./lib/utils/get-mcrypt-key.js')();

// Set up Server
var server = new hapi.Server();
var https = server.connection(connectionConfig.https);
var http = server.connection(connectionConfig.http);

// Set server-wide authKey
server.app.authKey = mcryptAuthKey;

// Set promise to be resolved when server is ready.
// Useful for testing
server.app.pluginsRegistered = new Promise(function(res, rej) {
    server.app.resolvePluginsRegistered = res;
    server.app.rejectPluginsRegistered = rej;
});

// Redirect stderr to server logs
process.stderr.on('data', function(data) {
    server.log(data);
});

// Helper functions
/**
 * get stored hawk credentials from db
 * @param {string} id - the id (public key)
 * @param {function} callback - callback with signature:
 *   `function(error, credentials){ ... }`
 */
function getHawkCredentials(id, callback) {
    var redisClient = server.plugins['hapi-redis'].client;
    redisClient.hgetall(id, function(err, credentials) {
        if (err) {
            callback(err, false);
        } else if (!credentials) {
            callback(null, false);
        } else {
            callback(null, credentials);
        }
    });
}

var plugins = [
    {
        register: require('hapi-redis'),
        options: redisConfig
    },
        require('inject-then'),
        require('hapi-auth-basic'),
        require('hapi-auth-hawk'),
    {
        register: require('hapi-redis'),
        options: redisConfig
    },
    {
        register: require('good'),
        options: goodConfig
    },
    {
        register: require('hapi-bookshelf-models'),
        options: {
            knex: knexConfig,
            plugins: ['registry'],
            models: './lib/models/'
        }
    },
    {
        register: require('./lib/utils/response-formatter.js'),
        options: {
            excludeVarieties: ['view', 'file'],
            excludePlugins: ['hapi-swagger']
        }
    },
    {
        register: require('./lib/utils/register-routes.js'),
        options: { routesPath: 'lib/app-routes' }
    },
    {
        register: require('hapi-swagger'),
        options: {
            apiVersion: require('./package.json').version
        }
    },
    {
        register: require('../hapi-relations'),
        options: {
            template: config.get('permissionsSchemaPath'),
            client: redisClient
        }
    }
];
/*
server.register(
    {
        register: require('hapi-swaggered'),
        options: config.get('swaggerConfig')

    },
    {
        select: 'http'
    },
    (err) => {
        if (err) {
            throw err;
        }
    }

);
*/

server.register(
    plugins,
    function pluginError(err) {
        if (err) {
            server.log('Failed loading plugin: ' + err);
            server.app.rejectPluginsRegistered(err);
        }

        https.auth.strategy(
            'default',
            'hawk',
            { getCredentialsFunc: getHawkCredentials }
        );

        https.auth.default('default');

        // Wrap models with Shield
        require('./lib/utils/shields-up.js');

        http.route({
            method: '*',
            path: '/{path*}',
            handler: function(request, reply) {
                var url = require('url');
                var newUrl = url.format({
                    protocol: 'https',
                    hostname: request.info.hostname,
                    port: config.get('httpsPort'),
                    pathname: request.url.path,
                    query: request.query
                });

                //reply('Please use https instead of http.');
                reply.redirect(newUrl);
            }
        });

        if (!module.parent) {
            server.start(function() {
                console.log('server running at: ' + server.info.uri);
            });
        }

        server.app.resolvePluginsRegistered();
    }

);

module.exports = server;
