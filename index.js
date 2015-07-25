'use strict';

var fs = require('fs');
var hapi = require('hapi');
var basic = require('hapi-auth-basic');
var hawk = require('hapi-auth-hawk');
var good = require('good');
var config = require('config');
var glob = require('glob');

var knexConfig = require('./lib/utils/get-knex-config.js')();
var goodConfig = require('./lib/utils/get-good-config.js')();
var redisConfig = require('./lib/utils/get-redis-config.js')();
var connectionConfig = require('./lib/utils/get-connection-options.js')();

// Set up Server
var server = new hapi.Server();
var https = server.connection(connectionConfig.https);
var http = server.connection(connectionConfig.http);

// load mcrypt auth key
var dbEncryptionKeyPath = config.get('dbEncryptionKeyPath');
server.app.authKey = fs.readFileSync(dbEncryptionKeyPath).toString().trim();

process.stderr.on('data', function(data) {
    console.log(data);
});

// Helper functions
/**
 * get stored hawk credentials from db
 * @param {string} id - the id (public key)
 * @param {function} callbck - callback with signature:
 *   `function(error, credentials){ ... }`
 */
var getHawkCredentials = function(id, callback) {
    var redisClient = server.plugins['hapi-redis'].client;
    redisClient.hgetall(id, function(err, credentials) {
        if (!credentials) {
            callback(null, false);
        } else {
            callback(null, credentials);
        }
    });
};

server.register(
    {
        register: require('hapi-redis'),
        options: redisConfig
    },
    function handleFirstRegistration(err) {
        if (err) {
            server.log('Error loading plugins');
            server.log(err.toString);
            throw err;
        }

        registerOtherPlugins();
    }

);

/**
 * Generate a plugin array, including all route plugins under lib/app_routes
 * @return {array}
 */
var setPlugins = function() {
    var plugins = [
        require('inject-then'),
        {
            register: require('hapi-redis'),
            options: redisConfig
        },
        basic,
        hawk,
        {
            register: good,
            options: goodConfig},
        {
            register: require('hapi-bookshelf-models'),
            options: {
                knex: knexConfig,
                plugins: ['registry'],
                models: './lib/models/'
            }
        }
    ];

    // add route plugins
    var newRoute;
    glob.sync('./lib/app_routes/*.js').forEach(function(file) {
        newRoute = {
            register: require(file),
            options: {
                redisClient: server.plugins['hapi-redis'].client,
                relations: server.plugins.hapiRelations
            }
        };
        plugins.push(newRoute);
    });

    return plugins;
};

server.app.pluginsRegistered = new Promise(function(res, rej) {
    server.app.resolvePluginsRegistered = res;
    server.app.rejectPluginsRegistered = rej;
});

function registerOtherPlugins() {
    return server.register(
        setPlugins(),
        function pluginError(err) {
            if (err) {
                console.log('Failed loading plugin: ' + err);
                server.app.rejectPluginsRegistered(err);
            }

            console.log('testing bookshelf-plugs');
            var Study = server.plugins.bookshelf.model('Study');
            console.log(typeof Study);

            // jscs:disable
            console.log(new Study({study_id: 347})); // jshint ignore:line
            // jscs:enable
            https.auth.strategy(
                'default',
                'hawk',
                { getCredentialsFunc: getHawkCredentials }
            );
            https.auth.default('default');

            // Mock relations plugin
            server.plugins.relations = require('relations');
            var relationsSchema = require(config.get('permissionsSchemaPath'));
            var loadSchema = require('./lib/permissions/load-schema.js');
            loadSchema(server.plugins.relations, relationsSchema);

            // Wrap models with Shield
            var shield = require('bookshelf-shield');
            var shieldConfig = config.get('shieldConfig');

            // no shield config for User and UserStudyRole models yet
            //var models = server.plugins.bookshelf._models;
            var models = {
                Study: server.plugins.bookshelf.model('Study')
            };
            shield({
                models: models,
                config: shieldConfig,
                acl: server.plugins.relations
            });

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

            // Hawk protected route:
            // Requests must provide valid hawk signature
            https.route({
                method: 'GET',
                path: '/restricted',
                config: {
                    handler: function(request, reply) {
                        console.log('request received');
                        reply('top secret');
                    }
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
}

module.exports = server;
