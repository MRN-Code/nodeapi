'use strict';

var boom = require('boom');
var uuid = require('uuid');
var bcrypt = require('bcrypt');
var config = require('config');
var mcrypt = require('mcrypt').MCrypt;
var cypher = new mcrypt('rijndael-128', 'ecb');
cypher.open(config.userMcryptKey);

exports.register = function (server, options, next) {
    // Private route to get new hawk credentials
    // Requests must authenticate with a username and password
    var client = options.redisClient;
    var relations = options.relations;

    // Private functions

    /**
     * Validate user credentials against records in the mock-db
     * @param {string} username - unencrypted username
     * @param {string} password - unencrypted password
     * @param {function} callback - callback function with signature `function(err, isValid) {...}`
     */
    var validateUser = function (username, password, callback) {
        var User = server.plugins.bookshelf.model('User');
        if (!username || !password) { 
            return callback(null, false);
        }
        
        new User({'username' :  cypher.encrypt(username.trim()).toString('base64')})
            .fetch()
            .then(function(user) {
    
                // php formats hashes with the $2y$ vs node's $2a$
                // this corrects them, as the hashes are functionally the same otherwise
                var correctedPass = user.get('password_hash').replace(/^\$2y\$/i, '\$2a$');
                console.dir(correctedPass);
                bcrypt.compare(password, correctedPass, function(err, res) {
                    callback(err, res, {name: user.get('username')});
                });
            }).catch(function(e) {
                    console.log("Error", e);
            });
        /*
        var userDB = { john: config.defaultUser };
        var user = userDB[username];
        if (!user) {
            return callback(null, false);
        }
    
        bcrypt.compare(password, user.password, function (err, isValid) {
            callback(err, isValid, { id: user.id, name: user.username });
        });*/
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
    var getUserStudyRole = function (relations, username) {
        var StudyRole = server.plugins.bookshelf.model('UserStudyRolePriv')
        var RoleCollection = server.plugins.bookshelf.Collection.extend({ model: StudyRole });
        //testing username
        username = 'gr6jwhvO3hIrWRhK0LTfXA==';
    
        RoleCollection.query().where({ username: username }).select().then(function (records) {
            records.forEach(function (record) {
                relations.coins(
                    '%s is the %s of %s', username, record.role_label.toUpperCase(), record.study_id
                );
            });
        });
    };

    server.auth.strategy('pwd', 'basic', { validateFunc: validateUser });
    server.route({
        method: 'GET',
        path: '/login',
        config: {
            auth: 'pwd',
            handler: function (request, reply) {
                var username = request.auth.credentials.name;
                getUserStudyRole(relations, username);
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
    next();
};

exports.register.attributes = {
    name: 'login'
};
