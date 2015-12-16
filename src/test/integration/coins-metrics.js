'use strict';

const chai = require('chai');
const server = require('../../index.js');
const initApiClient = require('../utils/init-api-client.js');
let apiClient;
let credentials;

/**
 * set the apiClient variable inside the parent closure
 * @param  {object} client an initialized API Client
 * @return {object}        the same API Client
 */
const setApiClient = function(client) {
    apiClient = client;
    return client;
};

// Set should property of all objects for BDD assertions
chai.should();

describe('Replace this with what your test describes', () => {

    // Always wait for the server to be ready before beginning any tests
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient);
    });

    it('provides COINS metrics', () => {
        apiClient.coinsMetrics.get()
            .then((response) => {
                response.statusCode.should.to.eql(200);
            });
    });
});
