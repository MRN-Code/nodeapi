'use strict';

const client = require('./codegen-client/src/index.js');
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

    // create a new instance of the agent because authClient adds an
    // interceptor, and we do not want to modify the global agent.
    const xhrAgent = config.xhrAgent.create();

    // initialize the default ApiClient
    client.ApiClient.init(config.apiUrl, xhrAgent);

    // intialize the authClient, which wraps the auth methods of the apiClient
    client.auth = authClient.init(client, config.authStore);
    return client;
};
