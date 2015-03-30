'use strict';

var hapi = require('hapi');
var basic = require('hapi-auth-basic');
var hawk = require('hapi-auth-hawk');
var good = require('good');
var config = require('config');
var redis = require('redis');
var client = redis.createClient(config.get('redis').port, config.get('redis').host);

var babel = require('babel/register');
var glob = require('glob');
var relations = require('relations');
relations.use(relations.stores.redis, {
    client: client,
    prefix: 'USER_PERM'
});

var permScheme = require('./lib/permission/permScheme')(relations);
var knex = require('knex')(config.get('dbconfig'));
var bookshelf = require('bookshelf')(knex);

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

// Set up DB
//var userDB = { john: config.defaultUser };

client.on('error', function() {
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
    client.hgetall(id, function(err, credentials) {
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
    var plugins = [ basic, hawk, gd ];

    // add route plugins
    var newRoute;
    glob.sync('./lib/app_routes/*.js').forEach (function (file) {
        newRoute = {
            register: require(file),
            options: {
                bookshelf: bookshelf,
                redisClient: client,
                relations: permScheme
            }
        };
        plugins.push(newRoute);
    });
    return plugins;
};

/**
 * Check user permission on request
 * @param {object} request - request object sent from browser
 * @param {function} callback - callback function with signature (boolean)
 * return
 */
var checkPermission = function (request, callback) {
    var allowed = true;
    if (request.url.path.indexOf('/study/') === 0) {
        var method = request.method.toUpperCase();
        var study_id = request.url.path.split('/')[2];
        var username = 'gr6jwhvO3hIrWRhK0LTfXA==';
        // Doing permission check
        permScheme.coins('Can %s GET_STUDY from %s', username, study_id, function (err, can) {
            if (!can) {
                //console.log('not allowed');
                allowed = false;
            }
            return callback(allowed);
        });
    } else {
        return callback(allowed);
    }
};

server.ext('onRequest', function(request, reply) {
    var result = function (allowed) {
        if (!allowed) {
            return reply('You have no permission on this action.');
        } else {
            return reply.continue();
        }
    };
    checkPermission(request, result);
});

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
