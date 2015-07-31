'use strict';

const authUtils = { initialized: false };
const config = require('config');
const uuid = require('uuid');

module.exports = function(redisClient) {
    if (authUtils.initialized) {
        return authUtils;
    }

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

    return authUtils;
};
