'use strict';

const _ = require('lodash');
const server = require('../../index.js');
const formatResponseCallback = (response) => {
    response.body = response.result;
    return response;
};

const formatRequestHeaders = (headers) => {
    return headers.reduce((target, header) => {
        target[header.name] = header.value;
        return target;
    }, {});
};

/**
 * Initialize the API client for use with testing
 * designed to be called after allPluginsLoaded resolves
 * @return {object} the initialized API Client
 */
module.exports = function initApiClient() {
    const config = require('config');
    const PouchDB = require('pouchdb');
    const apiClientOptions = {
        requestFn: _.bind(server.injectThen, server),
        requestObjectMap: {
            uri: 'url',
            body: 'payload'
        },
        baseUrl: 'http://localhost:' + config.get('httpsPort'),
        pouchClient: new PouchDB('api-test'),
        formatResponseCallback: formatResponseCallback,
        formatRequestHeaders: formatRequestHeaders
    };
    return require('../sdk/index.js')(apiClientOptions);
};
