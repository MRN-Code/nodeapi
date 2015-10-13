'use strict';

const chai = require('chai');
const server = require('../../index.js');
const initApiClient = require('../utils/init-api-client.js');
const uuid = require('uuid');

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

/**
 * get unique user data for testing
 * @return {object} an object of unique user data
 */
const getUserData = () => {
    return {
        username: uuid.v1().match(/^(.){10}/)[0],
        password: uuid.v1().match(/^(.){10}/)[0],
        email: uuid.v1().match(/^(.){10}/)[0] + '@test.com',
        label: 'Test Testerson'
    };
};

// Set should property of all objects for BDD assertions
chai.should();

describe('Users', () => {
    const handleAuthError = (err) => {
        return err.data;
    };

    // Always wait for the server to be ready before beginning any tests
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient);
    });

    describe('POST /users', () => {
        const userData = getUserData();
        it('Posts a new user', () => {
            return apiClient.users.post(userData)
                .then((response) => {
                    const result = response.result;
                    result.data[0].should.have.property('username');
                    result.data[0].username.should.equal(userData.username);
                    result.data[0].should.not.have.property('password');
                    result.data[0].should.not.have.property('passwordHash');
                });
        });

        it('Prevents a user with an existing username', () => {
            const tmpUserData = getUserData();
            tmpUserData.username = userData.username;
            return apiClient.users.post(tmpUserData)
                .catch(handleAuthError)
                .then((result) => {
                    const expectedDebugData = { username: userData.username };
                    const err = result.body.error;
                    result.statusCode.should.equal(422);
                    err.debugData.should.eql(expectedDebugData);
                });
        });

        it('Prevents a new user with an existing email', () => {
            const tmpUserData = getUserData();
            tmpUserData.email = userData.email;
            return apiClient.users.post(tmpUserData)
                .catch(handleAuthError)
                .then((result) => {
                    const expectedDebugData = { email: userData.email };
                    const err = result.body.error;
                    result.statusCode.should.equal(422);
                    err.debugData.should.eql(expectedDebugData);
                });
        });

        it('Prevents a new user with an empty password', () => {
            const tmpUserData = getUserData();
            tmpUserData.password = '';
            return apiClient.users.post(tmpUserData)
                .catch(handleAuthError)
                .then((result) => {
                    result.statusCode.should.equal(400);
                });

        });

    });
});
