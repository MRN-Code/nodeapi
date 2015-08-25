'use strict';

const authUtils = { initialized: false };
const config = require('config');
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const boom = require('boom');
const Mcrypt = require('mcrypt').MCrypt;
const cypher = new Mcrypt('rijndael-128', 'ecb');
const Bluebird = require('bluebird');
const bcryptCompare = Bluebird.promisify(bcrypt.compare);
const bcryptGenSalt = Bluebird.promisify(bcrypt.genSalt);
const bcryptHash = Bluebird.promisify(bcrypt.hash);
const moment = require('moment');
const _ = require('lodash');

module.exports = function(server) {
    const redisClient = server.plugins['hapi-redis'].client;

    if (authUtils.initialized) {
        return authUtils;
    }

    if (!redisClient.connected) {
        throw new Error('Redis client not connected: cannot continue');
    }

    cypher.open(server.app.authKey);

    /**
     * get stored hawk credentials from db
     * @param {string} id - the id (public key)
     * @param {function} callback - callback with signature:
     *   `function(error, credentials){ ... }`
     * @return {null}
     */
    authUtils.getHawkCredentials = function(id, callback) {
        redisClient.hgetall(id, function(err, credentials) {
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
     * @param {string} username - unencrypted username
     * @return {Bluebird} resolves to a credentials object
     *   where credentials is an object with the following properties:
     *   `id, key, algorithm, issueTime, expireTime`
     */
    authUtils.generateHawkCredentials = function(username) {
        const credentials = {
            username: username,
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
    authUtils.encryptUsername = (username) => {
        return cypher.encrypt(username.trim())
            .toString('base64');
    };

    /**
     * hash a plain text password
     * @param  {string} password the plain text password
     * @return {string}          the hashed string
     */
    authUtils.hashPassword = (password) => {
        return bcryptGenSalt(12)
            .then(_.partial(bcryptHash, password));
    };

    /**
     * Validate user credentials against records in the mock-db
     * @param {string} username - unencrypted username
     * @param {string} password - unencrypted password
     * @return {Bluebird} resolves to credentials if validation successful
                         resolves to false if Unsuccessul
                         rejects with error if an error occurred
     */
    authUtils.validateUser = function(username, password) {
        const User = server.plugins.bookshelf.model('User');
        let userObj = {};
        const encryptedUsername = authUtils.encryptUsername(username);
        if (!username || !password) {
            return Bluebird.reject(
                boom.unauthorized('Missing username or password')
            );
        }

        /**
         * validate that the user's account and pwd have not expired
         * @param  {object} user Bookshelf model for user
         * @return {object}      the user object
         */
        const checkAccountStatus = (user) => {
            if (user === null) {
                throw boom.unauthorized('Unknown username and password');
            }

            if (moment().isAfter(user.get('acct_exp_date'))) {
                throw boom.unauthorized('Account expired');
            }

            if (moment().isAfter(user.get('password_exp_date'))) {
                throw boom.unauthorized('Password expired');
            }

            if (user.get('active_flag') === 'N') {
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
        const comparePassword = (user) => {

            // php formats hashes with the $2y$ vs node's $2a$
            // this corrects them: the hashes are the same otherwise
            const rawPass = user.get('password_hash');
            const correctedPass = rawPass.replace(/^\$2y\$/i, '\$2a$');
            return bcryptCompare(password, correctedPass);
        };

        /**
         * handle pwd comparison results
         * @param  {boolean} res the result of a bcrypt.compare operation
         * @return {object}      and object of form { username: username }
         */
        const handleCompare = (res) => {
            if (!res) {
                throw boom.unauthorized('Invalid username and password');
            }

            return {
                username: userObj.get('username'),
                acctExpDate: userObj.get('acct_exp_date'),
                passwordExpDate: userObj.get('password_exp_date'),
                siteId: userObj.get('site_id')
            };
        };

        //TODO: if User is ever protected with the bookshelf shield,
        //we will need to figure out a way to get around that...
        return new User({username: encryptedUsername})
            .fetch()
            .then(checkAccountStatus)
            .then(comparePassword)
            .then(handleCompare)
            .catch(function(err) {
                server.log(['error', 'validate-user'], err);
                throw(err);
            });
    };

    return authUtils;
};
