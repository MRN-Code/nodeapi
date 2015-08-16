'use strict';

let me;
const baseUri = '/scans';

/**
 * get scans
 * @param  {object} queryParameters: optional object of query parameters
 *                                   See swagger docs for accepted parameters
 * @return {Promise}         a promise that resolves to server response
 *                           or rejects with an error, where error.data contains
 *                           the full response object
 */
function getScans(queryParameters) {
    queryParameters = queryParameters || {};

    const request = {
        method: 'GET',
        uri: baseUri,
        qs: queryParameters
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
        get: getScans
    };
}

module.exports = init;
