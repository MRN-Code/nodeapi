'use strict';

var fs = require('fs');
var hapi = require('hapi');
var basic = require('hapi-auth-basic');
var hawk = require('hapi-auth-hawk');
var good = require('good');
var config = require('config');
var redis = require('redis');
var glob = require('glob');

var redisClient = redis.createClient(
    config.get('redis').port,
    config.get('redis').host
);

var knexConfig = require('./lib/utils/get-knex-config.js')();

var goodConfig = require('./lib/utils/get-good-config.js');

var goodOptions = {
    reporters: [{
        reporter: require('good-console'),
        events:{ log: '*', response: '*' }
    }, {
        reporter: require('good-file'),
        events:{ log: '*', response: '*' },
        config: { path: config.get('logPath'), prefix: 'node', rotate: 'daily' }
    }]
};

// Set up DB
//var userDB = { john: config.defaultUser };

redisClient.on('error', function() {
    console.log('Failed to connect to redis server.');
}).on('connect', function() {
    console.log('Connected to redis server successfully.');
});

// Set up Server
var server = new hapi.Server();
var httpsOptions = {
    labels: ['https'],
    port: config.get('httpsPort')
};
var httpOption = {
    labels: ['http'],
    port: config.get('httpPort')
};
if (config.has('sslCertPath')) {
    httpsOptions.tls = require('./lib/utils/sslCredentials.js');
}

var https = server.connection(httpsOptions);
var http = server.connection(httpOption);

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
    redisClient.hgetall(id, function(err, credentials) {
        if (!credentials) {
            callback(null, false);
        } else {
            callback(null, credentials);
        }
    });
};

/**
 * Generate a plugin array, including all route plugins under lib/app_routes
 * @return {array}
 */
var setPlugins = function() {
    var plugins = [
        require('inject-then'),
        basic,
        hawk,
        {
            register: good,
            options: goodOptions
        },
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
                redisClient: redisClient,
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

server.register(
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
    });

module.exports = server;
