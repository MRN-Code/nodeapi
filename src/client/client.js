'use strict';

const clientFactory = require('./codegen-client/src/index.js');
const authClient = require('./authClient');

/**
 * Initialize the API client (singleton)
 * @param  {object} config contains properties:
 *                         apiUrl: the base URL of the remote API host
 *                         xhrAgent: the XHR Agent to be used: (axios)
 *                         authStore: a persistent data store for auth keys.
 *                             should implement a sync localstorage interface.
 * @return {object} apiClient object
 */
module.exports = (config) => {
    const client = clientFactory(config);

    // intialize the authClient, which wraps the auth methods of the apiClient
    client.auth = authClient.init(client, config.authStore);
    return client;
};
