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
const should = chai.should();

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
                apiClient.scans.get()
                .then((response) => {
                    response.result.data.should.have.length.of.at.least(1);
                    response.result.data[0].should.have.property('scan_id');
                    should.equal(response.result.error, null);
                });
            });
        });

        it('Should return scans by ursi', () => {
            return responsePromise.then((response) => {
                apiClient.scans.get({ursi: 'M06123761'})
                .then((response) => {
                    response.result.data.should.have.length.of.at.least(7);
                    response.result.data[0].should.have.property('scan_id');
                    should.equal(response.result.error, null);
                });
            });
        });

        it('Should return scans by study', () => {
            return responsePromise.then((response) => {
                apiClient.scans.get({study_id: 2319})
                .then((response) => {
                    response.result.data.should.have.length.of.at.least(9);
                    response.result.data[0].should.have.property('scan_id');
                    should.equal(response.result.error, null);
                });
            });
        });
    });
});
