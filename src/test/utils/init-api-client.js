'use strict';

const DomStorage = require('dom-storage');
const axios = require('axios');
const hp = require('halfpenny');
/**
 * Initialize the API client for use with testing
 * designed to be called after allPluginsLoaded resolves
 * @return {Promise} the initialized API Client
 */
module.exports = function initApiClient(server) {
    const port = server.connections[0].info.port;
    const apiClientOptions = {
        baseUrl: `http://localhost:${port}`,
        xhrAgent: axios,
        store: new DomStorage(null, { strict: true })
    };
    return new Promise((res, rej) => {
        const client  = hp.factory(apiClientOptions, (err, client) => {
            if (err) { return rej(err); }
            client.ApiClient.default.agent.interceptors.request.use((reqConfig) => {
                //simulate proxy service, since hawk expects to find the hostname
                //in the x-forwaded-host header field
                reqConfig.headers['x-forwarded-host'] = `localhost:${port}`;
                return reqConfig;
            });
            return res(client);
        });
    });
};
