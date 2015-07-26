'use strict';

const config = require('config');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
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
 * @return {Promise} a Promise that resolves to the jwt if the id is verified.
 *                     rejects otherwise
 */
function verifyHawkKey(jwt, keyStore) {
    return new Promise((res, rej) => {
        keyStore.hgetall(jwt.id, (err, val) => {
            if (err) {
                rej(err);
            } else {
                res(val);
            }
        });
    }).then((credentials) => {
        if (!credentials) {
            throw new Error('Credentials for jwt not found on server');
        }
        return jwt;
    });
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
 * @return {Promise} a promise resolving to the parsed object
 */
function parseCookie(cookieValue, hawkKeyStore) {
    return new Promise((res, rej) => {
        let parsed;
        try {
            parsed = jwt.verify(cookieValue, jwtSecret);
            res(parsed);
        } catch (err) {
            rej(err);
        }
    }).then((parsedJwt) => {
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
