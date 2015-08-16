'use strict';

const _ = require('lodash');
const qs = require('qs');
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
 * perform some intial formatting before allowing the API client to format
 * the response object. In this case, we need to append the query string params
 * to the uri
 * @param  {object} request request options, as formatted for node-request
 * @return {object}         request options to be used by auto-formatter
 */
const onPreFormatRequestOptions = (request) => {
    let queryString;
    if (request.qs) {
        queryString = qs.stringify(request.qs);
        if (queryString.length) {
            request.uri += '?' + queryString;
        }
    }

    return request;
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
        pouchClient: new PouchDB('/tmp/pouchdb-coins-api-test'),
        formatResponseCallback: formatResponseCallback,
        formatRequestHeaders: formatRequestHeaders,
        onPreFormatRequestOptions: onPreFormatRequestOptions
    };
    return require('../sdk/index.js')(apiClientOptions);
};
