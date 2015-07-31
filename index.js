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

// Define plugins
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
    }
];

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

server.register(
    plugins,
    function pluginError(err) {
        if (err) {
            server.log('Failed loading plugin: ' + err);
            server.app.rejectPluginsRegistered(err);
        }

        var redisClient = server.plugins['hapi-redis'].client;
        var authUtils = require('./lib/utils/authentication.js')(redisClient);

        https.auth.strategy(
            'default',
            'hawk',
            { getCredentialsFunc: authUtils.getHawkCredentials }
        );

        https.auth.default('default');

        // Mock relations plugin
        server.plugins.relations = require('relations');
        var relationsSchema = require(config.get('permissionsSchemaPath'));
        var loadSchema = require('./lib/permissions/load-schema.js');
        loadSchema(server.plugins.relations, relationsSchema);

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
