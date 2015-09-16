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
        root.CoinsApiClient.coinstac = root.CoinsApiClient.coinstac || {};
        root.CoinsApiClient.coinstac.consortia = factory();
    }
}(this, function() {

    'use strict';

    var baseUri = '/coinstac/consortia';

    var me;

    /**
     * fetch consortia
     * @param  {object} options: currently only supports {id: ...}
     * @return {Promise}          promise resolving to server response
     */
    function fetchConsortia(options) {
        var uri = baseUri;
        if (options && options.id) {
            uri += '/' + options.id;
        }

        var request = {
            method: 'GET',
            uri: uri
        };

        return me.makeRequest(request, false)
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
     * create a new consortium
     * @param  {options} options is the consortium properties. see swagger docs
     * @return {Promise}         a promise that resolves to server response
     */
    function createConsortium(options) {
        var request = {
            method: 'POST',
            uri: baseUri,
            body: options
        };

        return me.makeRequest(request, false)
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
     * update consortium
     * @param  {options} options is the consortium properties. see swagger docs
     * @return {Promise}         a promise that resolves to server response
     */
    function updateConsortium(options) {
        var request = {
            method: 'PUT',
            uri: baseUri + '/' + options._id,
            body: options
        };

        return me.makeRequest(request, false)
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
            get: fetchConsortia,
            post: createConsortium,
            put: updateConsortium
        };
    }

    return init;
}));
