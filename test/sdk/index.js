'use strict';

// TODO use semver to autmatically append to url
const _ = require('lodash');
const authKeyId = 'COINS_AUTH_CREDENTIALS';
const defaultConfig = {
    requestFn: null,
    requestObjectMap: {
        method: 'method',
        body: 'body',
        headers: 'headers',
        uri: 'uri'
    },
    baseUrl: 'https://api.coins.mrn.org',
    pouchClient: null,
    formatRequestHeaders: _.identity,
    formatResponseCallback: function(respArray) {
        respArray[0].body = JSON.parse(respArray[0].body);
        return respArray[0];
    }
};
const me = {};

/**
 * get the currently stored auth credentials
 * @param  {boolean} raw return raw pouchDB response (defaults to false)
 * @return {Promise}     resolves to the credentials object or the pouchDB resp
 */
const getAuthCredentials = (raw) => {
    const catchNotFound = (err) => {
        let newErr;
        if (err.status === 404) {
            return null;
        }

        newErr = new Error('API Client error getting Auth Credentials');
        newErr.data = err;
        throw newErr;
    };

    const formatResult = (result) => {
        if (result) {
            if (!raw) {
                return result.credentials;
            }
        }

        return result;
    };

    return me.config.pouchClient.get(authKeyId)
        .catch(catchNotFound)
        .then(formatResult);
};

/**
 * set auth credentials in pouchDB
 * @param  {object} val the credentials to be saved
 * @return {Promise}    resolves to an object containing the id and rev
 */
const setAuthCredentials = (val) => {
    if (val.credentials === undefined) {
        val = {credentials: val};
    }

    return getAuthCredentials(true)
        .then((existing) => {
            let rev;
            if (existing) {
                rev = existing._rev;
            }

            return me.config.pouchClient.put(val, authKeyId, rev);
        });
};

/**
 * generate the header expected by Hawk.
 * Note that the url must include a protocol and hostname
 * @param  {string} url
 * @param  {string} method e.g. 'GET'
 * @return {string} The hawk auth signature
 */
const generateHawkHeader = (url, method) => {
    return me.getAuthCredentials()
        .then((credentials) => {
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
const formatRequestOptions = (requestOptions) => {
    if (_.isFunction(me.config.onPreFormatRequestOptions)) {
        requestOptions = me.config.onPreFormatRequestOptions(requestOptions);
    }

    requestOptions.uri = me.config.baseUrl + requestOptions.uri;
    return _.mapKeys(requestOptions, (value, key) => {
        return me.config.requestObjectMap[key] || key;
    });
};

/**
 * make a request using config.requestFn
 * @param  {object} options request options to be passed to requestFn
 * @return {Promise}        promise that resolves with the value of the response
 */
const makeRequest = (options, sign) => {
    const formattedOptions = formatRequestOptions(options);

    /**
     * convenience function for sending the formatted request
     * @return {Promise} resolves to the formatted response value
     */
    const sendRequest = () => {
        return me.config.requestFn(formattedOptions)
            .then(me.config.formatResponseCallback);
    };

    /**
     * convenience function for adding a header property to the formattedOptions
     * @param  {object} header output from hawk.client.header();
     * @return {null}        nothing
     */
    const addFormattedHeader = (header) => {
        const headers = formattedOptions.headers || [];
        headers.push({
            name: 'Authorization',
            value: header.field
        });
        formattedOptions.headers = me.config.formatRequestHeaders(headers);
        return;
    };

    let masterPromise;
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
    me.getHawkHeader = require('hawk').client.header;
    me.generateHawkHeader = generateHawkHeader;
    me.makeRequest = makeRequest;
    me.setAuthCredentials = setAuthCredentials;
    me.getAuthCredentials = getAuthCredentials;
    me.auth = require('./authentication.js')(me);
    me.scans = require('./scans.js')(me);
    return me;
};
