'use strict';

const authUtils = { initialized: false };
const config = require('config');
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const Mcrypt = require('mcrypt').MCrypt;
const cypher = new Mcrypt('rijndael-128', 'ecb');
const Promise = require('bluebird');
const bcryptCompare = Promise.promisify(bcrypt.compare);

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
     * @return {Promise} resolves to a credentials object
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
        return Promise.resolve(credentials);
    };

    /**
     * Validate user credentials against records in the mock-db
     * @param {string} username - unencrypted username
     * @param {string} password - unencrypted password
     * @return {Promise} resolves to credentials if validation successful
                         resolves to false if Unsuccessul
                         rejects with error if an error occurred
     */
    authUtils.validateUser = function(username, password) {
        const User = server.plugins.bookshelf.model('User');
        if (!username || !password) {
            return Promise.resolve(false);
        }

        return new User({
            username: cypher.encrypt(username.trim()).toString('base64')
        })
            .fetch()
            .then((user) => {
                if (user === null) {
                    return false;
                }

                // php formats hashes with the $2y$ vs node's $2a$
                // this corrects them: the hashes are the same otherwise
                const rawPass = user.get('password_hash');
                const correctedPass = rawPass.replace(/^\$2y\$/i, '\$2a$');
                return bcryptCompare(password, correctedPass)
                    .then((res) => {
                        if (res) {
                            return {username: user.get('username')};
                        }
                        return false;
                    });
            }).catch(function(err) {
                server.log(err);
                throw(err);
            });
    };
    return authUtils;
};
