'use strict';
const clientFactory = require('../../dist/client/codegen-client-compiled/src/index.js');
const authClient = require('./authClient');

/**
 * Initialize the API client (singleton)
 * @param  {object} config contains properties:
 *                         apiUrl: the base URL of the remote API host
 *                         xhrAgent: the XHR Agent to be used: (axios)
 *                         store: a persistent data store for auth keys.
 *                             should implement a sync localstorage interface.
 * @return {object} apiClient object
 */
module.exports = (config) => {
    // create a new instance of the agent because authClient adds an
    // interceptor, and we do not want to modify the global agent.
  config.xhrAgent = config.xhrAgent.create();

  const client = clientFactory(config);

    // intialize the authClient, which wraps the auth methods of the apiClient
  client.auth = authClient.init(client, config);
  return client;
};
