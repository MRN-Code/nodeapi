var fs = require('fs');
var Bcrypt = require('bcrypt');
var uuid = require('uuid');
var Hapi = require('hapi');
var Basic = require('hapi-auth-basic');
var Hawk = require('hapi-auth-hawk');
var Good = require('good');
var Boom = require('boom');

// Config:
var config = {
    hawkKeyLifespan: 30 * 60 * 1000, // 30 minutes
    defaultUser: {
        username: 'john',
        password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm',   // 'secret'
        name: 'John Doe',
        id: '2133d32a'
    }
};

var goodOptions = {
    opsInterval: 1000,
    reporters: [{
        reporter: require('good-console'),
        args:[{ log: '*', response: '*' }]
    }]
};

// Set up DB
var userDB = {john: config.defaultUser};
var hawkDB = {};

// Set up Server
var server = new Hapi.Server();
server.connection({ host: 'localhost', port: 3000 });

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

    Bcrypt.compare(password, user.password, function (err, isValid) {
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
            algorithm: 'sha256', // move to config
            issueTime: +new Date(),
            expireTime: +new Date() + config.hawkKeyLifespan
        };
    }
    catch(err) {
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
    var credentials = hawkDB[id];
    if (!credentials) {
        callback(null, false);
    } else {
        callback(null, credentials);
    }
};

server.register([
    Basic,
    Hawk,
        {
            register: Good,
            options: goodOptions
        }
    ], function (err) {
        server.auth.strategy('pwd', 'basic', { validateFunc: validateUser }); // see hapijs.com for more info
        server.auth.strategy('default', 'hawk', { getCredentialsFunc: getHawkCredentials });
        server.auth.default('default');
        // Public route: no authorization required
        // This is where the client will be served from
        server.route({
            method: 'GET',
            path: '/{param*}',
            config: {
                auth: false,
                handler: {
                    directory: {
                        path: 'public'
                    }
                }
            }
        });

        // Private route to get new hawk credentials
        // Requests must authenticate with a username and password
        server.route({
            method: 'GET',
            path: '/login',
            config: {
                auth: 'pwd',
                handler: function (request, reply) {
                    var username = request.auth.credentials.username;
                    var serveHawkCredentials = function(err, credentials) {
                        if (err) {
                            reply(Boom.wrap(err, 500));
                        } else {
                            hawkDB[credentials.id] = credentials;
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
        server.route({
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
