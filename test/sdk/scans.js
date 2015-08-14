'use strict';
const _ = require('lodash');


let me;

/**
 * attempt to login to the API. This sets the API credentials
 * @param  {string} username is the username to login with
 * @param  {string} password is the password to login with
 * @return {Promise}         a promise that resolves to server response
 *                           or rejects with an error, where error.data contains
 *                           the full response object
 */
function get(queryParameters) {
    let baseUri = '/scans';

    if (queryParameters) {
        baseUri += '?';
        _.each(queryParameters,(n, key) => {
            baseUri += key + '=' + n + '&';
        });
        baseUri = baseUri.slice(0, -1);
    }

    const request = {
        method: 'GET',
        uri: baseUri,
    };
    return me.makeRequest(request, true)
        .then((response) => {
            let err;
            if (response.statusCode !== 200) {
                err = new Error(response.body.error.message);
                err.data = response;
                throw err;
            } else {
                return response;
            }
        });
}

/**
 * initialize the internals with the config from index.js
 * @param  {object} config the config object from index.js
 * @return {null}        nothing
 */
function init(base) {
    me = base;
    return {
        get: get,
    };
}

module.exports = init;
