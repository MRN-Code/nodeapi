/* jshint strict:false */
/* global define */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory());
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.CoinsApiClient = root.CoinsApiClient || {};
        root.CoinsApiClient.users = factory();
    }
}(this, function() {

    'use strict';

    var baseUri = '/users';

    var me;

    /**
     * create a new user
     * @param  {object} userData user form data: see swagger for expected fields
     * @return {Promise}          promise resolving to server response
     */
    function createUser(userData) {
        var request = {
            method: 'POST',
            uri: baseUri,
            body: userData
        };

        return me.makeRequest(request)
            .then(function(response) {
                var err;
                if (response.statusCode !== 200) {
                    err = new Error(response.body.error.message);
                    err.data = response;
                    throw err;
                }

                return response;
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
            post: createUser
        };
    }

    return init;
}));
