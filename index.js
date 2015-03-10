'use strict';
var fs = require('fs');
var bcrypt = require('bcrypt');
var uuid = require('uuid');
var hapi = require('hapi');
var basic = require('hapi-auth-basic');
var hawk = require('hapi-auth-hawk');
var good = require('good');
var boom = require('boom');
var config = require('config');
var redis = require('redis');
var babel = require('babel/register');

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
var userDB = { john: config.defaultUser };

var client = redis.createClient(config.get('redis').port, config.get('redis').host);
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
    httpsOptions.tls = require('./utils/sslCredentials.js');
}
var https = server.connection(httpsOptions);
var http = server.connection(httpOption);

process.stderr.on('data', function(data) {
    console.log(data);
});

// Helper functions
/**
 * Validate user credentials against records in the mock-db
 * @param {string} username - unencrypted username
 * @param {string} password - unencrypted password
 * @param {function} callback - callback function with signature `function(err, isValid) {...}`
 */
var validateUser = function (username, password, callback) {
    var user = userDB[username];
    if (!user) {
        return callback(null, false);
    }

    bcrypt.compare(password, user.password, function (err, isValid) {
        callback(err, isValid, { id: user.id, name: user.username });
    });
};

/**
 * Generate a new key pair for a user
 * @param {string} username - unencrypted username
 * @param {function} callback - callback function with signature `function(err, credentials) {...}`
 *   where credentials is an object with the following properties:
 *   `id, key, algorithm, issueTime, expireTime`
 */
var generateHawkCredentials = function(username, callback) {
    var credentials;
    try {
        credentials = {
            id: uuid.v4(),
            key: uuid.v4(),
            algorithm: config.algorithm,
            issueTime: +new Date(),
            expireTime: +new Date() + config.hawkKeyLifespan
        };
    }
    catch (err) {
        callback(err, null);
        return;
    }
    callback(null, credentials);
    return;
};

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

server.register([
        basic,
        hawk,
        {
            register: good,
            options: goodOptions
        },
        {
            register: require('./app_routes/getAllStudies'),
            options: { bookshelf: bookshelf }
        },
        {
            register: require('./app_routes/getOneStudy'),
            options: { bookshelf: bookshelf }
        }
        ], function (err) {
            if (err) {
                console.log('Failed loading plugin');
                //exit?
            }
            https.auth.strategy('pwd', 'basic', { validateFunc: validateUser }); // see hapijs.com for more info
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
            // Public route: no authorization required
            // This is where the client will be served from
            https.route({
                method: 'GET',
                path: '/{path*}',
                config: {
                    auth: false,
                    handler: {
                        directory: {
                            path: 'public',
                            index: true,
                            defaultExtension: 'html'
                        }
                    }
                }
            });

            // Private route to get new hawk credentials
            // Requests must authenticate with a username and password
            https.route({
                method: 'GET',
                path: '/login',
                config: {
                    auth: 'pwd',
                    handler: function (request, reply) {
                        var username = request.auth.credentials.name;
                        var serveHawkCredentials = function(err, credentials) {
                            if (err) {
                                reply(boom.wrap(err, 500));
                            } else {
                                client.sadd(username, credentials.id);
                                client.hmset(credentials.id, credentials);
                                reply(credentials);
                            }
                        };
                        // Generate new key pair and serve back to user
                        generateHawkCredentials(username, serveHawkCredentials);
                    }
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
            // get key(s)
            https.route({
                method: 'GET',
                path: '/profile/keys',
                config: {
                    //auth: false,
                    handler: function (request, reply) {
                        var username = 'john';
                        var keys = [];
                        client.smembers(username, function (err, members) {
                            var count = 0;
                            members.forEach(function(id) {
                                client.hget(id, 'key', function (err, key) {
                                    keys.push(key);
                                    count++;
                                    if (count === members.length) {
                                        reply(keys);
                                    }
                                });
                            });
                        });
                    }
                }
            });

            // get specific key
            https.route({
                method: 'GET',
                path: '/profile/key/{id}',
                config: {
                    //auth: false,
                    handler: function (request, reply) {
                        var username = 'john';
                        var id = request.params.id;
                        client.sismember(username, id, function (err, valid) {
                            if (valid) {
                                client.hget(id, 'key', function (err, key) {
                                    reply(key);
                                });
                            } else {
                                reply('Invalid id provided');
                            }
                        });
                    }
                }
            });

            // logout
            https.route({
                method: 'GET',
                path: '/logout',
                config: {
                    handler: function (request, reply) {
                        var username = 'john';
                        var id = '7c1ef832-e872-4607-b682-18262d30961f';//request.auth.credentials.id;
                        //remove id-key upon logging out
                        client.exists(id, function(err, exist) {
                            if (exist) {
                                client.del(id, function(err, success) {
                                    client.srem(username, id);
                                });
                            }
                        });
                        reply('You are logged out.').code(200);
                    }
                }
            });

            server.start(function () {
                console.log('server running at: ' + server.info.uri);
            });
        });

module.exports = server;
