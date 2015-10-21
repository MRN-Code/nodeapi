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
            let complete = false;
            const watcher = _.filter(
                controller.consortiumDbClients,
                { name: consortiumDb.name }
            )[0].watcher;

            const consortiumChangeListener = (aggregate) => {
                if (!complete && aggregate.contributors.length === 2) {
                    complete = true;
                    watcher.removeListener(
                        'change:aggregate',
                        consortiumChangeListener
                    );
                    done();
                }
            };

            watcher.on(
                'changed:aggregate',
                consortiumChangeListener
            );

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
                history: [{test: true}],
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
                history: [{test: true}],
                username: 'mocha2'
            };
            return Bluebird.all([
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

        it('re-computes aggregate of all analyses', (done) => {
            const consortiumChangeListener = (event) => {
                const aggregate = event.aggregate;
                aggregate.should.have.property('data');
                aggregate.should.have.property('files');
                aggregate.should.have.property('error');
                aggregate.should.have.property('aggregate');
                aggregate.should.have.property('contributors');
                aggregate.data.should.have.property('objective');
                aggregate.data.should.have.property('gradient');
                aggregate.data.should.have.property('mVals');
                aggregate.data.should.have.property('r2');
                aggregate.aggregate.should.equal(true);
                aggregate.history[0].files.should.include('cde');
                aggregate.history[0].files.should.include('efg');
                aggregate.history[0].files.should.include('ghi');
                aggregate.contributors.length.should.equal(0);
                aggregate.history[0].contributors.should.include('mocha1');
                aggregate.history[0].contributors.should.include('mocha2');
                aggregate.history[0].contributors.should.include('mocha3');
                chai.expect(aggregate.error).to.be.null; //jshint ignore:line
                done();
            };

            const watcher = _.filter(
                controller.consortiumDbClients,
                { name: consortiumDb.name }
            )[0].watcher;

            watcher.once(
                'waitingOnAnalyses',
                consortiumChangeListener
            );

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
                    history: [{test: true}],
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
