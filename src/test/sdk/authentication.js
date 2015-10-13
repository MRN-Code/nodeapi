/* jshint strict:false */
/* global define */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory(btoa));
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        var base64 = (function() {
            if (typeof btoa !== 'undefined') {
                return btoa;
            }

            return require('btoa');
        })();

        module.exports = factory(base64);
    } else {
        // Browser globals (root is window)
        root.CoinsApiClient = root.CoinsApiClient || {};
        root.CoinsApiClient.authentication = factory(root.btoa);
    }
}(this, function(btoa) {

    'use strict';

    var baseUri = '/auth';

    var me;

    /**
     * generate the authentication payload expected by POST /auth/keys route
     * @param  {string} username
     * @param  {string} password
     * @return {object} object to be sent as POST data to /auth/keys
     */
    function generateLoginPayload(username, password) {
        return {
            username: btoa(username),
            password: btoa(password)
        };
    }

    /**
     * attempt to login to the API. This sets the API credentials
     * @param  {string} username is the username to login with
     * @param  {string} password is the password to login with
     * @return {Promise}         a promise that resolves to server response
     *                           or rejects with an error, where error.data
     *                           contains the full response object
     */
    function login(username, password) {
        var authPayload = generateLoginPayload(username, password);
        var request = {
            method: 'POST',
            uri: baseUri + '/keys',
            body: authPayload
        };
        return me.makeRequest(request, false)
            .then(function(response) {
                var err;
                if (response.statusCode !== 200) {
                    err = new Error(response.body.error.message);
                    err.data = response;
                    throw err;
                } else {
                    return me.setAuthCredentials(response.body.data[0])
                        .then(function() { return response; });
                }
            });
    }

    /**
     * logout of the application
     * @param  {string} id     (optional) is the id to logout.
     *                         defaults to the currently logged in ID.
     * @return {Promise}       a promise that resolves to server response
     *                         or rejects with an error, where error.data
     *                         contains the full response object
     */
    function logout(id) {
        /**
         * set options and send request
         * @param  {object} credentials hawk credentials object
         * @return {Promise}             resolves to response
         */
        var sendRequest = function(credentials) {
            id = id || credentials.id;
            var uri = baseUri + '/keys/' + id;
            var method = 'DELETE';
            var request = {
                method: method,
                uri: uri
            };
            return me.makeRequest(request, true);
        };

        /**
         * handle response from server: throwing an error if needed
         * also unsets the local store of credentials
         * @param  {object} response the response sent back from the server
         * @return {Promise}          resolves to the response object
         */
        var handleResponse = function(response) {
            var loggedOutCreds = { status: 'logged out', date: Date.now() };
            var err;

            /**
             * convenience function to return the response
             * @return {object} response object
             */
            var returnResponse = function() {
                return response;
            };

            if (response.statusCode !== 200) {
                err = new Error(response.body.error.message);
                err.data = response;
                throw err;
            }

            return me.setAuthCredentials(loggedOutCreds)
                .then(returnResponse);
        };

        return me.getAuthCredentials()
            .then(sendRequest)
            .then(handleResponse);
    }

    /**
     * initialize the internals with the config from index.js
     * @param  {object} config the config object from index.js
     * @return {null}        nothing
     */
    function init(base) {
        me = base;
        return {
            login: login,
            logout: logout
        };
    }

    return init;
}));
