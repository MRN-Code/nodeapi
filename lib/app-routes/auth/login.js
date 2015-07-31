'use strict';

const boom = require('boom');
const bcrypt = require('bcrypt');
const config = require('config');
const Mcrypt = require('mcrypt').MCrypt;
const casCookieUtils = require('../../utils/cas-cookie-utils.js');

const cypher = new Mcrypt('rijndael-128', 'ecb');

exports.register = function(server, options, next) {
    // Private route to get new hawk credentials
    // Requests must authenticate with a username and password
    const redisClient =  server.plugins['hapi-redis'].client;
    const relations = server.plugins.hapiRelations;
    const authUtils = require('../../utils/authentication.js')(redisClient);

    cypher.open(server.app.authKey);

    // Private functions
    /**
     * Validate user credentials against records in the mock-db
     * @param {string} username - unencrypted username
     * @param {string} password - unencrypted password
     * @param {function} callback - callback function with signature
     *                            	`function(err, isValid) {...}`
     */
    const validateUser = function(username, password, callback) {
        const User = server.plugins.bookshelf.model('User');
        if (!username || !password) {
            return callback(null, false);
        }

        new User({
            username: cypher.encrypt(username.trim()).toString('base64')
        })
            .fetch()
            .then(function(user) {
                if (user === null) {
                    return callback(null, false);
                }

                // php formats hashes with the $2y$ vs node's $2a$
                // this corrects them: the hashes are the same otherwise
                const rawPass = user.get('password_hash');
                const correctedPass = rawPass.replace(/^\$2y\$/i, '\$2a$');
                bcrypt.compare(password, correctedPass, function(err, res) {
                    callback(err, res, {username: user.get('username')});
                });
            }).catch(function(err) {
                server.log(err);
                callback(err, false, {});
            });
    };

    server.auth.strategy('pwd', 'basic', { validateFunc: validateUser });
    server.state(config.get('casCookieName'), {
        path: '/',
        domain: config.get('cookieDomain')
    });

    server.route({
        method: 'GET',
        path: '/login',
        config: {
            tags: ['api', 'auth'],
            notes: 'Expects uame/pwd to be in HTTP Authorization header',
            description: 'Get new API key and JWT cookie',
            auth: 'pwd',
            handler: function(request, reply) {
                const username = request.auth.credentials.username;
                const serveHawkCredentials = function(credentials) {
                    const casCookie = casCookieUtils.generate(credentials);
                    redisClient.sadd(username, credentials.id);
                    redisClient.hmset(credentials.id, credentials);
                    reply(credentials)
                        .state(config.get('casCookieName'), casCookie);
                };

                // Generate new key pair and serve back to user
                authUtils.generateHawkCredentials(username)
                    .then(serveHawkCredentials)
                    .catch((err) => {
                        reply(boom.wrap(err));
                    });
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'login'
};
