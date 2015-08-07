'use strict';

const chai = require('chai');
const server = require('../../');
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

describe('Scan route test', () => {
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient);
    });

    describe('Successful login', () => {
        let responsePromise;
        before(() => {
            responsePromise = apiClient.auth.login('mochatest', 'mocha');
            return responsePromise;
        });

        it('Should return all scans', () => {
            return responsePromise.then((response) => {
                return new Promise((res, rej) => {
                    const url = 'http://localhost/scans';
                    const request = {
                        method: 'GET',
                        url: url
                    };
                    server.inject(request, function(response) {
                        if(response.statusCode !== '200') {
                            rej(new Error('sdfsdf'));
                        } else {
                            console.log(response);
                            res('ddd');
                        }
                    });
                });
            });
        });
    });
});
