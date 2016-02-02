'use strict';

const DomStorage = require('dom-storage');
const axios = require('axios');
const clientFactory = require('../../client/dist/client.js');

/**
 * Initialize the API client for use with testing
 * designed to be called after allPluginsLoaded resolves
 * @return {object} the initialized API Client
 */
module.exports = function initApiClient(server) {
    const port = server.connections[0].info.port;
    const apiClientOptions = {
        apiUrl: `http://localhost:${port}`,
        xhrAgent: axios,
        authStore: new DomStorage(null, { strict: true })
    };
    const client  = clientFactory(apiClientOptions);
    client.ApiClient.default.agent.interceptors.request.use((reqConfig) => {
        //simulate proxy service, since hawk expects to find the hostname
        //in the x-forwaded-host header field
        reqConfig.headers['x-forwarded-host'] = `localhost:${port}`;
        return reqConfig;
    });
    return client;
};
