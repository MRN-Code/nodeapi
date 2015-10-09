'use strict';

var authUtils = { initialized: false };
var config = require('config');
var uuid = require('uuid');
var bcrypt = require('bcrypt');
var boom = require('boom');
var cypher = require('./get-mcrypt-cypher.js')();
var Bluebird = require('bluebird');
var bcryptCompare = Bluebird.promisify(bcrypt.compare);
var bcryptGenSalt = Bluebird.promisify(bcrypt.genSalt);
var bcryptHash = Bluebird.promisify(bcrypt.hash);
var moment = require('moment');
var _ = require('lodash');
var userController = require('../controllers/users.js');

module.exports.register = function (server, options, next) {
    var redisClient = server.plugins['hapi-redis'].client;

    if (!redisClient.connected) {
        throw new Error('Redis client not connected: cannot continue');
    }

    /**
     * get stored hawk credentials from db
     * @param {string} id - the id (public key)
     * @param {function} callback - callback with signature:
     *   `function(error, credentials){ ... }`
     * @return {null}
     */
    authUtils.getHawkCredentials = function (id, callback) {
        redisClient.hgetall(id, function (err, credentials) {
            if (err) {
                callback(err, false);
            } else if (!credentials) {
                callback(null, false);
            } else {
                callback(null, credentials);
            }
        });
    };

    /**
     * Generate a new key pair for a user
     * Even though this is a synchronous function, it returns a promise
     * This will allow for an easy transition to async key generators
     * @param {string} user - user model (pre-sanitized)
     * @return {Bluebird} resolves to a credentials object
     *   where credentials is an object with the following properties:
     *   `id, key, algorithm, issueTime, expireTime`
     */
    authUtils.generateHawkCredentials = function (user) {
        var username = user.get('username');
        var credentials = {
            username: username,
            user: userController.sanitize(user).toJSON(),
            id: uuid.v4(),
            key: uuid.v4(),
            algorithm: config.algorithm,
            issueTime: +new Date(),
            expireTime: +new Date() + config.hawkKeyLifespan
        };
        return Bluebird.resolve(credentials);
    };

    /**
     * encrypt a username
     * @param  {string} username
     * @return {string} the encrypted username
     */
    authUtils.encryptUsername = function (username) {
        var encrypted = cypher.encrypt(username.trim()).toString('base64');
        return encrypted;
    };

    /**
     * hash a plain text password
     * @param  {string} password the plain text password
     * @return {string}          the hashed string
     */
    authUtils.hashPassword = function (password) {
        return bcryptGenSalt(12).then(_.partial(bcryptHash, password));
    };

    /**
     * Validate user credentials against records in the mock-db
     * @param {string} username - unencrypted username
     * @param {string} password - unencrypted password
     * @return {Bluebird} resolves to credentials if validation successful
                         resolves to false if Unsuccessul
                         rejects with error if an error occurred
     */
    authUtils.validateUser = function (username, password) {
        var User = server.plugins.bookshelf.model('User');
        var userObj = {};
        var encryptedUsername = authUtils.encryptUsername(username);
        if (!username || !password) {
            return Bluebird.reject(boom.unauthorized('Missing username or password'));
        }

        /**
         * validate that the user's account and pwd have not expired
         * @param  {object} user Bookshelf model for user
         * @return {object}      the user object
         */
        var checkAccountStatus = function checkAccountStatus(user) {
            if (user === null) {
                throw boom.unauthorized('Unknown username and password');
            }

            if (moment().isAfter(user.get('acctExpDate'))) {
                throw boom.unauthorized('Account expired');
            }

            if (moment().isAfter(user.get('passwordExpDate'))) {
                throw boom.unauthorized('Password expired');
            }

            if (user.get('activeFlag') === 'N') {
                throw boom.unauthorized('Account deactivated');
            }

            //set userObj in closure
            userObj = user;

            return user;
        };

        /**
         * compare the password_hash of the user model to `password` in closure
         * @param  {BookshelfModel} user bookshelf Model representing the user
         * @return {Bluebird} a promise that resolves to true or false
         */
        var comparePassword = function comparePassword(user) {

            var rawPass = user.get('passwordHash');
            var msg = undefined;

            // validate that rawPass is not falsy
            if (!rawPass) {
                msg = 'Empty pwd hash for ' + user.get('username');
                server.log(['info', 'validate-user'], msg);
                return Bluebird.resolve(false);
            }

            // php formats hashes with the $2y$ vs node's $2a$
            // this corrects them: the hashes are the same otherwise
            var correctedPass = rawPass.replace(/^\$2y\$/i, '\$2a$');
            return bcryptCompare(password, correctedPass);
        };

        /**
         * handle pwd comparison results
         * @param  {boolean} res the result of a bcrypt.compare operation
         * @return {object}      user model
         * */
        var handleCompare = function handleCompare(res) {
            if (!res) {
                throw boom.unauthorized('Invalid username and password');
            }

            return userObj;
        };

        //TODO: if User is ever protected with the bookshelf shield,
        //we will need to figure out a way to get around that...
        return new User({ username: encryptedUsername }).fetch().then(checkAccountStatus).then(comparePassword).then(handleCompare)['catch'](function (err) {
            server.log(['error', 'validate-user'], err);
            throw err;
        });
    };

    server.expose('auth', authUtils);
    next();
};

module.exports.register.attributes = {
    name: 'utilities'
};