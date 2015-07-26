'use strict';

var boom = require('boom');
var uuid = require('uuid');
var bcrypt = require('bcrypt');
var config = require('config');
var Mcrypt = require('mcrypt').MCrypt;
var cypher = new Mcrypt('rijndael-128', 'ecb');
var casCookieUtils = require('../../utils/cas-cookie-utils.js');

exports.register = function(server, options, next) {
    // Private route to get new hawk credentials
    // Requests must authenticate with a username and password
    var redisClient =  server.plugins['hapi-redis'].client;
    var relations = server.plugins.hapiRelations;

    cypher.open(server.app.authKey);

    // Private functions
    /**
     * Validate user credentials against records in the mock-db
     * @param {string} username - unencrypted username
     * @param {string} password - unencrypted password
     * @param {function} callback - callback function with signature
     *                            	`function(err, isValid) {...}`
     */
    var validateUser = function(username, password, callback) {
        var User = server.plugins.bookshelf.model('User');
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
                var rawPass = user.get('password_hash');
                var correctedPass = rawPass.replace(/^\$2y\$/i, '\$2a$');
                console.dir(correctedPass);
                bcrypt.compare(password, correctedPass, function(err, res) {
                    callback(err, res, {name: user.get('username')});
                });
            }).catch(function(err) {
                server.log(err);
                callback(err, false, {});
            });
    };

    /**
     * Generate a new key pair for a user
     * @param {string} username - unencrypted username
     * @param {function} callback - callback function with signature
     *   `function(err, credentials) {...}`
     *   where credentials is an object with the following properties:
     *   `id, key, algorithm, issueTime, expireTime`
     */
    var generateHawkCredentials = function(username, callback) {
        var credentials;
        try {
            credentials = {
                username: username,
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
     * Get user's study role priv from db
     * @param {object} bookshelf - bookshelf object
     * @param {object} relations - node-relations object
     * @param {string} username - current username
     * @return {array}
     */
    var getUserStudyRole = function(relations, username) {
        var bookshelf = server.plugins.bookshelf;
        var StudyRole = bookshelf.model('UserStudyRolePriv');
        var RoleCollection = bookshelf.Collection.extend({ model: StudyRole });

        //testing username
        username = 'gr6jwhvO3hIrWRhK0LTfXA==';

        /* commenting out for now
        RoleCollection.query()
            .where({ username: username })
            .select()
            .then(function(records) {
                records.forEach(function(record) {
                    server.plugins.relations.study(
                        '%s is the %s of %s',
                        username,
                        record.role_label.toUpperCase(), //jshint ignore:line
                        record.study_id //jshint ignore: line
                    );
                });
            });
        */
    };

    server.auth.strategy('pwd', 'basic', { validateFunc: validateUser });
    server.state(config.get('casCookieName'), {
        path: '/',
        domain: config.get('cookieDomain'),
    });

    server.route({
        method: 'GET',
        path: '/login',
        config: {
            auth: 'pwd',
            handler: function(request, reply) {
                var username = request.auth.credentials.name;
                getUserStudyRole(relations, username);
                var serveHawkCredentials = function(err, credentials) {
                    var casCookie;
                    if (err) {
                        reply(boom.wrap(err, 500));
                    } else {
                        casCookie = casCookieUtils.generate(credentials);
                        redisClient.sadd(username, credentials.id);
                        redisClient.hmset(credentials.id, credentials);
                        reply(credentials)
                            .state(config.get('casCookieName'), casCookie);
                    }
                };

                // Generate new key pair and serve back to user
                generateHawkCredentials(username, serveHawkCredentials);
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'login'
};
