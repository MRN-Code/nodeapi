'use strict';

var hapi = require('hapi');
var basic = require('hapi-auth-basic');
var hawk = require('hapi-auth-hawk');
var good = require('good');
var boom = require('boom');
var config = require('config');

var babel = require('babel/register');
var glob = require('glob');

var bookshelfOptions = {
    knex: config.get('dbconfig'),
    plugins: ['registry'], // Required
    models: './lib/models',
    //base: require('../path/to/model/base') // optional
};

var goodOptions = {
    //opsInterval: 1000,
    reporters: [{
        reporter: require('good-console'),
        args:[{ log: '*', response: '*' }]
    }, {
        reporter: require('good-file'),
        args: [{ path: config.get('logPath'), prefix: 'node', rotate: 'daily' }, { log: '*', response: '*' }]
    }]
};

var redisOptions = config.get('redis');

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
    server.plugins['hapi-redis'].client.hgetall(id, function(err, credentials) {
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
var setPlugins = function () {
    var gd = {
        register: good,
        options: goodOptions
    };
    var bookshelfModels = {
        register: require('hapi-bookshelf-models'),
        options: bookshelfOptions
    };
    var redis = {
        register: require('hapi-redis'),
        options: redisOptions
    };
    var acl = {
        register: require('./lib/acl/acl.js')
    };

    var plugins = [ basic, hawk, gd, bookshelfModels, redis, acl ];

    // add route plugins
    var newRoute;
    glob.sync('./lib/app_routes/*.js').forEach (function (file) {
        newRoute = {
            register: require(file)
        };
        plugins.push(newRoute);
    });
    return plugins;
};



server.register(
    setPlugins(),
    function (err) {
        if (err) {
            console.log('Failed loading plugin');
            //exit?
        }
        https.auth.strategy('default', 'hawk', { getCredentialsFunc: getHawkCredentials });
        https.auth.default('default');

        http.route({
            method: '*',
            path: '/{path*}',
            handler: function(request, reply) {
                //reply('Please use https instead of http.');
                reply.redirect('https://' + request.info.hostname + ':' + config.httpsPort + request.url.path);
            }
        });

        // Hawk protected route:
        // Requests must provide valid hawk signature
        https.route({
            method: 'GET',
            path: '/restricted',
            config: {
                handler: function (request, reply) {
                    console.log('request received');
                    reply('top secret');
                }
            }
        });

        server.start(function () {
            console.log('server running at: ' + server.info.uri);
        });
    });

module.exports = server;
