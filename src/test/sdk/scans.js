/* jshint strict:false */
/* global define */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.CoinsApiClient = root.CoinsApiClient || {};
        root.CoinsApiClient.scans = factory();
    }
}(this, function() {

    'use strict';

    var me;
    var baseUri = '/scans';

    /**
     * get scans
     * @param  {object} queryParameters: optional object of query parameters
     *                                   See swagger docs for accepted
     *                                   parameters
     * @return {Promise}         a promise that resolves to server response
     *                           or rejects with an error, where error.data
     *                           contains the full response object
     */
    function getScans(queryParameters) {
        queryParameters = queryParameters || {};

        var request = {
            method: 'GET',
            uri: baseUri,
            qs: queryParameters
        };

        return me.makeRequest(request, true)
            .then(function(response) {
                var err;
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

    return init;
}));
