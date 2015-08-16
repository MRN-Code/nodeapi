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
     * Validate user credentials against records in the mock-db
     * @param {string} username - unencrypted username
     * @param {string} password - unencrypted password
     * @return {Bluebird} resolves to credentials if validation successful
                         resolves to false if Unsuccessul
                         rejects with error if an error occurred
     */
    authUtils.validateUser = function(username, password) {
        const User = server.plugins.bookshelf.model('User');
        const encryptedUsername = cypher.encrypt(username.trim())
            .toString('base64');
        if (!username || !password) {
            return Bluebird.reject(
                boom.unauthorized('Missing username or password')
            );
        }

        /**
         * compare the password_hash of the user model to `password` in closure
         * @param  {BookshelfModel} user bookshelf Model representing the user
         * @return {Bluebird} a promise that resolves to true or false
         */
        const comparePassword = (user) => {
            if (user === null) {
                throw boom.unauthorized('Unknown username and password');
            }

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

            return { username: username };
        };

        return new User({username: encryptedUsername})
            .fetch()
            .then(comparePassword)
            .then(handleCompare)
            .catch(function(err) {
                server.log(['error', 'validate-user'], err);
                throw(err);
            });
    };

    return authUtils;
};
