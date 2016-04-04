'use strict';

const chai = require('chai');
const serverReady = require('../utils/get-server.js');
const Bluebird = require('bluebird');
const initApiClient = require('../utils/init-api-client.js');
let apiClient;
let server;

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
 * set server variable inside parent clojure
 * @param  {object} hapiServer the server object returned by serverReady promise
 * @return {object}            the same server object
 */
const setServer = (hapiServer) => {
    server = hapiServer;
    return hapiServer;
};

// Set should property of all objects for BDD assertions
const should = chai.should();

describe('Scan routes', () => {
    before('wait for server to be ready', () => {
        return serverReady
            .then(setServer)
            .then(initApiClient)
            .then(setApiClient)
            .then(function addScanPrivsToTestUser() {
                return new Bluebird((res, rej) => {
                    server.plugins.relations.study(
                        'mochatest is pi of 8320',
                        (err) => {
                            if (err) {
                                rej(err);
                            } else {
                                res();
                            }
                        }

                    );
                });
            });
    });

    describe('GET /scans', () => {
        before(() => {
            return apiClient.auth.login('mochatest', 'mocha');
        });

        it('Should return all scans', () => {
            return apiClient.ScansApi.get()
                .then((response) => {
                    response.data.data.should.have.length.of.at.least(1);
                    response.data.data[0].should.have.property('scanId');
                    should.equal(response.data.error, null);
                });
        });

        it('Should return scans by ursi', () => {
            return apiClient.ScansApi.get(null, 'M99938215')
                .then((response) => {
                    response.data.data.should.have.length.of.at.least(1);
                    response.data.data[0].should.have.property('scanId');
                    should.equal(response.data.error, null);
                });
        });

        it('Should return scans by study', () => {
            return apiClient.ScansApi.get(8320)
                .then((response) => {
                    response.data.data.should.have.length.of.at.least(1);
                    response.data.data[0].should.have.property('scanId');
                    should.equal(response.data.error, null);
                });
        });

        it('Should return a single scan by ID');
    });

    //TODO need to test it thoroughly again near future
    describe('GET /scans/id/', () => {
        before(() => {
            return apiClient.auth.login('mochatest', 'mocha');
        });

        it('Should return all scans and series and series data', () => {
            return apiClient.ScansidApi.get(366998)
            .then((response) => {
                response.data.data.should.have.length.of.at.least(1);
                should.equal(response.data.error, null);
            });
        });
    });

    describe('POST /scans', () => {
        it('Should reject an invalid payload');
        it('Should add a new scan with a valid payload');
        it('Should reject with 400 if URSI is not enrolled in study');
    });

    describe('PUT /scans', () => {
        it('Should reject an invalid payload');
        it('Should update an existing scan with a valid payload');
        it('Should reject with 400 if URSI is not enrolled in study');
    });
});
