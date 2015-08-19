'use strict';

// TODO use semver to autmatically append to url
var _ = require('lodash');
var storage = (function() {
    if (typeof localStorage !== 'undefined') {
        return localStorage;
    }

    var Storage = require('dom-storage');

    return new Storage(null, { strict: true });
})();

var authKeyId = 'COINS_AUTH_CREDENTIALS';
var defaultConfig = {
    requestFn: null,
    requestObjectMap: {
        method: 'method',
        body: 'body',
        headers: 'headers',
        uri: 'uri'
    },
    baseUrl: 'https://coins-api.mrn.org/api',
    version: require('./../../package.json').version,
    formatRequestHeaders: _.identity,
    formatResponseCallback: function(respArray) {
        respArray[0].body = JSON.parse(respArray[0].body);
        return respArray[0];
    }
};
var me = {};

/**
 * get the currently stored auth credentials
 * @return {Promise}     resolves to the credentials object or the pouchDB resp
 */
var getAuthCredentials = function() {
    return new Promise(function(resolve) {
        resolve(JSON.parse(storage.getItem(authKeyId)));
    });
};

/**
 * set auth credentials
 * @param  {object} val the credentials to be saved
 * @return {Promise}    resolves to an object containing the id and rev
 */
var setAuthCredentials = function(credentials) {
    return new Promise(function(resolve) {
        storage.setItem(authKeyId, JSON.stringify(credentials));
        resolve(getAuthCredentials());
    });
};

/**
 * generate the header expected by Hawk.
 * Note that the url must include a protocol and hostname
 * @param  {string} url
 * @param  {string} method e.g. 'GET'
 * @return {string} The hawk auth signature
 */
var generateHawkHeader = function(url, method) {
    return me.getAuthCredentials()
        .then(function(credentials) {
            if (!credentials) {
                throw new Error('No credentials found to sign with');
            }

            return me.getHawkHeader(url, method, { credentials: credentials });
        });
};

/**
 * format requestObj for use by requestFn
 * @param  {object} requestObj the object to be passed to the requestFn
 * @return {object}            the object after mapping keys to new ones
 */
var formatRequestOptions = function(requestOptions) {
    if (_.isFunction(me.config.onPreFormatRequestOptions)) {
        requestOptions = me.config.onPreFormatRequestOptions(requestOptions);
    }

    requestOptions.uri = [
        me.config.baseUrl,
        '/v' + me.config.version,
        requestOptions.uri
    ].join('');
    return _.mapKeys(requestOptions, function(value, key) {
        return me.config.requestObjectMap[key] || key;
    });
};

/**
 * make a request using config.requestFn
 * @param  {object} options request options to be passed to requestFn
 * @return {Promise}        promise that resolves with the value of the response
 */
var makeRequest = function(options, sign) {
    var formattedOptions = formatRequestOptions(options);

    /**
     * convenience function for sending the formatted request
     * @return {Promise} resolves to the formatted response value
     */
    var sendRequest = function() {
        return me.config.requestFn(formattedOptions)
            .then(me.config.formatResponseCallback);
    };

    /**
     * convenience function for adding a header property to the formattedOptions
     * @param  {object} header output from hawk.client.header();
     * @return {null}        nothing
     */
    var addFormattedHeader = function(header) {
        var headers = formattedOptions.headers || [];
        headers.push({
            name: 'Authorization',
            value: header.field
        });
        formattedOptions.headers = me.config.formatRequestHeaders(headers);
        return;
    };

    var masterPromise;
    if (sign !== false) {
        masterPromise = generateHawkHeader(
            formattedOptions.url,
            formattedOptions.method
        )
            .then(addFormattedHeader);
    } else {
        masterPromise = Promise.resolve();
    }

    return masterPromise.then(sendRequest);
};

module.exports = function init(config) {
    _.defaultsDeep(config, defaultConfig);
    me.config = config;
    me.getHawkHeader = require('hawk/lib/browser.js').client.header;
    me.generateHawkHeader = generateHawkHeader;
    me.makeRequest = makeRequest;
    me.setAuthCredentials = setAuthCredentials;
    me.getAuthCredentials = getAuthCredentials;
    me.auth = require('./authentication.js')(me);
    me.scans = require('./scans.js')(me);
    return me;
};
