'use strict';

const chai = require('chai');
const server = require('../../index.js');
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
            return apiClient.coinstac.consortia.get()
                .then((response) => {
                    const data = response.result.data;
                    data.should.have.property('length');
                    data.length.should.equal(mockConsortia.length);
                    data[0].should.have.property('_id');
                });
        });

        it('Gets a single consortium', () => {
            return apiClient.coinstac.consortia
                .get({ id: mockConsortia[0]._id })
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
            return apiClient.coinstac.consortia.post(consortium)
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

                    return controller.getConsortiumDb({ name: id, server })
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

        it('Allows new analyses to be added to consortium', (done) => {
            let aggCount = 0;
            const consortiumChangeListener = (doc) => {
                ++aggCount;
                if (aggCount == 2) {
                    controller.docChanges.removeListener('change:aggregate', consortiumChangeListener);
                    done();
                }
            }
            controller.docChanges.on('change:aggregate', consortiumChangeListener);

            const analysisResults1 = {
                _id: 'analysis01',
                fileShas: ['cde'],
                data: {
                    objective: 1,
                    gradient: {
                        'Left-Hippocampus': 1
                    },
                    r2: 0.1
                },
                history: [],
                username: 'mocha1'
            };
            const analysisResults2 = {
                _id: 'analysis02',
                fileShas: ['efg'],
                data: {
                    objective: 2,
                    gradient: {
                        'Left-Hippocampus': 2
                    },
                    r2: 0.2
                },
                history: [],
                username: 'mocha2'
            };
            Bluebird.all([
                consortiumDb.save(analysisResults1),
                consortiumDb.save(analysisResults2)
            ]);
        });

        it('Adds the usernames of contributors to aggregate', () => {
            const getAggregate = () => {
                return consortiumDb.all()
                    .then((docs) => {
                        return _.find(docs, {aggregate: true});
                    });
            };

            return getAggregate().then((aggregate) => {
                aggregate.should.have.property('contributors');
                aggregate.contributors.should.include('mocha1');
                aggregate.contributors.should.include('mocha2');
            });
        });

        it('re-computes average of all analyses', (done) => {
            const consortiumChangeListener = (average) => {
                average.should.have.property('data');
                average.should.have.property('files');
                average.should.have.property('error');
                average.should.have.property('sampleSize');
                average.should.have.property('aggregate');
                average.should.have.property('contributors');
                average.data.should.have.property('objective');
                average.data.should.have.property('gradient');
                average.data.should.have.property('mVals');
                average.data.should.have.property('r2');
                average.sampleSize.should.equal(3);
                average.aggregate.should.equal(true);
                average.files.should.include('cde');
                average.files.should.include('efg');
                average.files.should.include('ghi');
                average.contributors.should.include('mocha1');
                average.contributors.should.include('mocha2');
                average.contributors.should.include('mocha3');
                chai.expect(average.error).to.be.null;
                done();
            };
            controller.docChanges.once('change:aggregate', consortiumChangeListener);

            const addAnalysis = () => {
                const analysis = {
                    _id: 'analysis03',
                    fileShas: ['ghi'],
                    data: {
                        objective: 3,
                        gradient: {
                            'Left-Hippocampus': 3
                        },
                        r2: 0.3
                    },
                    history: [],
                    username: 'mocha3'
                };
                return consortiumDb.save(analysis);
            };

            addAnalysis();
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
                .get({ id: mockConsortia[0]._id })
                .then(modifyConsortium)
                .then(apiClient.coinstac.consortia.put)
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
