'use strict';

const chai = require('chai');
const server = require('../../');
const Bluebird = require('bluebird');
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
const should = chai.should();

describe('Scan routes', () => {
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient)
            .then(function addScanPrivsToTestUser() {
                return new Bluebird((res, rej) => {
                    server.plugins.relations.study(
                        'mochatest is pi of 2319',
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
            return apiClient.scans.get()
                .then((response) => {
                    response.result.data.should.have.length.of.at.least(9);
                    response.result.data[0].should.have.property('scanId');
                    should.equal(response.result.error, null);
                });
        });

        it('Should return scans by ursi', () => {
            return apiClient.scans.get({ ursi: 'M06123761' })
                .then((response) => {
                    response.result.data.should.have.length.of.at.least(7);
                    response.result.data[0].should.have.property('scanId');
                    should.equal(response.result.error, null);
                });
        });

        it('Should return scans by study', () => {
            return apiClient.scans.get({ studyId: 2319 })
                .then((response) => {
                    response.result.data.should.have.length.of.at.least(9);
                    response.result.data[0].should.have.property('scanId');
                    should.equal(response.result.error, null);
                });
        });

        it('Should return a single scan by ID');
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
