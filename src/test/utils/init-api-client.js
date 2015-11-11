'use strict';

const _ = require('lodash');
const qs = require('qs');
const path = require('path');
const pkg = require(path.join(process.cwd(), 'package.json'));
const server = require('../../index.js');
const formatResponseCallback = (response) => {
    response.body = response.result;
    return response;
};

const formatRequestHeaders = (headers) => {
    headers = headers || [];

    // HAWK auth relies on x-forwarded-host headers...
    headers.push({name: 'x-forwarded-host', value:'localhost:8800' });
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

    //Add fake remote IP address
    request.remoteAddress = 'mochatestIP';

    return request;
};

/**
 * Initialize the API client for use with testing
 * designed to be called after allPluginsLoaded resolves
 * @return {object} the initialized API Client
 */
module.exports = function initApiClient() {
    const config = require('config');
    const apiClientOptions = {
        requestFn: _.bind(server.injectThen, server),
        requestObjectMap: {
            uri: 'url',
            body: 'payload',
        },
        baseUrl: 'http://localhost:' + config.get('httpPort') + '/api',
        formatResponseCallback: formatResponseCallback,
        formatRequestHeaders: formatRequestHeaders,
        onPreFormatRequestOptions: onPreFormatRequestOptions,
        version: pkg.version
    };
    return require('halfpenny')(apiClientOptions);
};
