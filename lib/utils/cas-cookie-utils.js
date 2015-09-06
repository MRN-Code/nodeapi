'use strict';

const config = require('config');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const Bluebird = require('bluebird');
const jwtSecretPath = config.get('jwtSecretPath');
const jwtSecret = fs.readFileSync(jwtSecretPath).toString().trim();
const jwtOptions = {
    algorithm: 'HS256',
    expiresInMinutes: 30
};
const excludedCredentialKeys = [
    'key',
    'algorithm',
    'issueTime',
    'expireTime'
];

/**
 * verify that the jwt id is in the hawk key store
 * @param  {object} jwt is a decoded jsonwebtoken with an id property
 * @param  {redisClient} keyStore is the client connected to the hawk keystore
 *                                Note: this must be promisified!
 * @return {Promise} a Bluebird that resolves to the jwt if the id is verified.
 *                     rejects otherwise
 */
function verifyHawkKey(jwt, keyStore) {
    let keyError;

    /**
     * handle the results of hgetall: throw HawkKeyNotFound if nothing found
     * @param  {object} credentials credentials returned from redis
     * @return {object}             the jwt passed in as input in parent closure
     */
    const handleHgetallResults = (credentials) => {
        if (!credentials) {
            keyError = new Error('Credentials for jwt not found on server');
            keyError.name = 'HawkKeyNotFound';
            keyError.message = 'Credentails for JWT not found. Logged out?';
            throw keyError;
        }

        return jwt;
    };

    return keyStore.hgetallAsync(jwt.id)
        .then(handleHgetallResults);
}

/**
 * Set cookie value with given username and timestamp
 * @param {credentials} object with username and hawkPubKey
 * @return {string} the encrypted string (JWT)
 */
function getNewCookieValue(_credentials) {

    //jwt mutates the data object passed in, so clone it to prevent that
    const credentials = _.omit(_credentials, excludedCredentialKeys);
    return jwt.sign(credentials, jwtSecret, jwtOptions);
}

/**
 * Parse a cookie, decrypting it first
 * @param {string} cookieValue is the raw cookie value
 * @param  {redisClient} keyStore is the client connected to the hawk keystore
 *                                Note: this must be promisified!
 * @return {Promise} a promise resolving to the parsed object
 */
function parseCookie(cookieValue, hawkKeyStore) {
    /**
     * Handle JWT errors by wrapping them in a promise
     * This is designed to be the input to a Bluebird constructor
     * @param  {function} res promise resolver
     * @param  {function} rej promise rejecter
     * @return {null}     nothing
     */
    const jwtVerifyAsPromised = (res, rej) => {
        let parsed;
        try {
            parsed = jwt.verify(cookieValue, jwtSecret);
            res(parsed);
        } catch (err) {
            rej(err);
        }
    };

    if (
        !hawkKeyStore ||
        typeof hawkKeyStore.hgetallAsync !== 'function'
    ) {
        return Bluebird.reject(new Error('Invalid keyStore passed'));
    }

    // The JWT library throws errors, will catch them and pass them as a promise
    return new Bluebird(jwtVerifyAsPromised)
        .then((parsedJwt) => {
            return verifyHawkKey(parsedJwt, hawkKeyStore);
        });
}

/**
 * Get a value that invalidates the cookie
 * This essentially logs the user out
 * @return {string}
 */
function invalidateCookie() {
    return 'LOGGEDOUT';
}

module.exports = {
    generate: getNewCookieValue,
    verifyAndParse: parseCookie,
    invalidate: invalidateCookie
};
