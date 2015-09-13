'use strict';

const chai = require('chai');
const server = require('../../');
const _ = require('lodash');
const Bluebird = require('bluebird');
const mockConsortia = require('../../lib/mocks/mock-consortia.json');
const initApiClient = require('../utils/init-api-client.js');
const controller = require('../../lib/controllers/coinstac/consortia.js');
let apiClient;

/**
 * set the apiClient variable inside the parent closure
 * @param  {object} client an initialized API Client
 * @return {object}        the same API Client
 */
const setApiClient = (client) => {
    apiClient = client;
    return client;
};

// Set should property of all objects for BDD assertions
chai.should();

describe('Coinstac Consortia', () => {

    // Always wait for the server to be ready before beginning any tests
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient);
    });

    describe('GET', () => {
        it('Gets all consortia', () => {
            return apiClient.coinstac.consortia.fetch()
                .then((response) => {
                    const data = response.result.data;
                    data.should.have.property('length');
                    data.length.should.equal(mockConsortia.length);
                    data[0].should.have.property('_id');
                });
        });

        it('Gets a single consortium', () => {
            return apiClient.coinstac.consortia
                .fetch({ id: mockConsortia[0]._id })
                .then((response) => {
                    const data = response.result.data;
                    data.should.have.property('length');
                    data.length.should.equal(1);
                    data[0].should.have.property('_id');
                    data[0]._id.should.equal(mockConsortia[0]._id);
                });

        });

    });

    describe('POST', () => {
        let consortiumDb;
        it('Adds a new consortium', () => {
            const consortium = {
                label: 'POST test consortium',
                description: 'added as part of integration tests',
                users: [],
                tags: [],
                analyses: []
            };
            return apiClient.coinstac.consortia.create(consortium)
                .then((response) => {
                    const data = response.result.data;
                    let id;
                    data.should.have.property('length');
                    data.length.should.equal(1);
                    data[0].should.have.property('_id');
                    id = data[0]._id;
                    data[0].should.have.property('dbUrl');
                    _.forEach(consortium, (val, key) => {
                        data[0].should.have.property(key);
                        data[0][key].should.eql(val);
                    });

                    return controller.getConsortiumDb(id, server)
                        .then((result) => {
                            consortiumDb = result;
                        });
                });
        });

        it('Adds a pouch/couch Db for the new consortium', () => {
            chai.expect(consortiumDb).to.exist; //jshint ignore:line
            consortiumDb.should.have.property('info');
            return consortiumDb.info();
        });

        it('Allows new analyses to be added to consortium', () => {
            const addAnalysis = () => {
                const analysis = {
                    _id: 'analysis01',
                    files: ['cde'],
                    result: {CortexVol: 500000},
                    owner: 'mocha2'
                };
                return consortiumDb.save(analysis);
            };

            return addAnalysis();
        });

        it('re-computes average of all analyses', () => {
            const addAnalysis = () => {
                const analysis = {
                    _id: 'analysis02',
                    files: ['abc'],
                    result: {CortexVol: 400000},
                    owner: 'mocha'
                };
                return consortiumDb.save(analysis);
            };

            const getAggregate = () => {
                return consortiumDb.all()
                    .then((docs) => {
                        return _.find(docs, {aggregate: true});
                    });
            };

            const waitForAggregateCalc = (arg) => {
                return Bluebird.delay(arg, 100);
            };

            return addAnalysis()
                .then(waitForAggregateCalc)
                .then(getAggregate)
                .then((average) => {
                    average.should.have.property('result');
                    average.should.have.property('files');
                    average.should.have.property('error');
                    average.should.have.property('sampleSize');
                    average.should.have.property('aggregate');
                    average.result.should.have.property('CortexVol');
                    average.sampleSize.should.equal(2);
                    average.aggregate.should.equal(true);
                    average.files.should.include('abc');
                    average.files.should.include('cde');
                    return chai.expect(average.error).to.be.null;
                });
        });

    });

    describe('PUT', () => {
        it('Updates a consortium', () => {

            /**
             * Modify a consortium retrieved from the API
             * @param  {object} response apiClient response object
             * @return {object}          modified consortium object
             */
            const modifyConsortium = (response) => {
                const consortium = response.result.data[0];
                consortium.description = 'modified during test';
                return consortium;
            };

            return apiClient.coinstac.consortia
                .fetch({ id: mockConsortia[0]._id })
                .then(modifyConsortium)
                .then(apiClient.coinstac.consortia.update)
                .then((response) => {
                    const data = response.result.data;
                    data.should.have.property('length');
                    data.length.should.equal(1);
                    data[0].should.have.property('_id');
                    data[0].description.should.equal('modified during test');
                });
        });
    });

});
