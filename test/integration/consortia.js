'use strict';

const chai = require('chai');
const server = require('../../');
const PouchW = require('pouchdb-wrapper');
const _ = require('lodash');
const Bluebird = require('bluebird');
const config = require('config');
const mockConsortia = require('../../lib/mocks/mock-consortia.json');
const initApiClient = require('../utils/init-api-client.js');
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

const mockConsortiaDb = () => {
    let db;

    //TODO: this only mocks the consortiaMeta DB, but actual consortium-dbs
    //TODO: still created on the remote

    // skip if we are configured to use cloudant
    if (config.has('coinstac.pouchdb.cloudant')) {
        console.log('Skipping mocking *ouch database');
        db = server.plugins.houchdb.consortiaMeta;
    } else {
        db = new PouchW({
            name: 'consortia-test',
            pouchConfig: { db: require('memdown') }
        });
        server.plugins.houchdb.consortiaMeta = db;
    }

    return db.clear()
        .then(() => {
            return Bluebird.all(_.map(mockConsortia, db.add, db));
        });
};

// Set should property of all objects for BDD assertions
chai.should();

describe('Coinstac Consortia', () => {

    // Always wait for the server to be ready before beginning any tests
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient)
            .then(mockConsortiaDb);
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
            return apiClient.coinstac.consortia.fetch({ id:'one' })
                .then((response) => {
                    const data = response.result.data;
                    data.should.have.property('length');
                    data.length.should.equal(1);
                    data[0].should.have.property('_id');
                    data[0]._id.should.equal('one');
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
                    data.should.have.property('length');
                    data.length.should.equal(1);
                    data[0].should.have.property('_id');
                    data[0].should.have.property('dbUrl');
                    _.forEach(consortium, (val, key) => {
                        data[0].should.have.property(key);
                        data[0][key].should.eql(val);
                    });

                    consortiumDb = new PouchW({
                        name: 'testConsortium',
                        url: data[0].dbUrl
                    });
                });
        });

        it('Adds a pouch/couch Db for the new consortium', () => {
            return consortiumDb.info();
        });

        it('Allows new analyses to be added to consortium', () => {
            const addAnalysis = () => {
                const analysis = {
                    fileSha: 'abc',
                    result: 2
                };
                return consortiumDb.add(analysis);
            };

            return addAnalysis();
        });

        it('re-computes average of all analyses', () => {
            let expectedAverage;
            const addAnalysis = () => {
                const analysis = {
                    fileSha: 'abc',
                    result: 4
                };
                return consortiumDb.add(analysis);
            };

            const setExpectedAverage = (avg) => {
                expectedAverage = avg;
            };

            const getAnalyses = () => {
                return consortiumDb.all()
                    .then((docs) => {
                        return _.filter(docs, (value) => {
                            return !value.aggregate
                        });
                    });
            };

            const getAggregate = () => {
                return consortiumDb.all()
                    .then((docs) => {
                        return _.find(docs, {aggregate: true});
                    });
            };

            const calculateAverage = (analyses) => {
                const sum = (arr) => {
                    return _.reduce(arr, (res, val) => {
                        return res + val;
                    }, 0);
                };

                const results = _.map(analyses, 'result');
                return sum(results) / results.length;
            };

            const waitForAggregateCalc = (arg) => {
                return Bluebird.delay(arg, 10);
            };

            return addAnalysis()
                .then(getAnalyses)
                .then(calculateAverage)
                .then(setExpectedAverage)
                .then(waitForAggregateCalc)
                .then(getAggregate)
                .then(_.property('result'))
                .then((actualAverage) => {
                    chai.expect(actualAverage).to.not.be.undefined; //jshint ignore:line
                    return actualAverage.should.equal(expectedAverage);
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

            return apiClient.coinstac.consortia.fetch({ id:'one' })
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
