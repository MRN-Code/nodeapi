'use strict';

const chai = require('chai');
const server = require('../../');
const initApiClient = require('../utils/init-api-client.js');
let apiClient;

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

describe('Users', () => {

    // Always wait for the server to be ready before beginning any tests
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient)
            .then(() => {
                return apiClient.auth.login('mochatest', 'mocha');
            });
    });

    it('Gets a list of all users', () => {
        return apiClient.users.get
            .then();
    });

    it('Gets a single user', () => {
        return apiClient.users.get('mochatest')
            .then();
    });

    it('Posts a new user');

    it('Prevents a user with an existing username');

    it('Prevents a new user with an existing email');

    it('Prevents a new user with an empty password');

    it('Updates an existing user');

    it('Prevents updating to an existing username');

    it('Prevents updating to an existing email');

    it('Prevents updating to an empty password');

});
