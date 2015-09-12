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
            return apiClient.coinstac.consortia.fetch({ id: mockConsortia[0]._id })
                .then((response) => {
                    const data = response.result.data;
                    console.dir(data[0]);
                    data.should.have.property('length');
                    data.length.should.equal(1);
                    data[0].should.have.property('_id');
                    data[0]._id.should.equal( mockConsortia[0]._id);
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
                    result: {a: 2, b: 2, c: 2}
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
                    result: {a: 4, b: 4, c: 4}
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
                            return !value.aggregate;
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
                /**
                 * sum like properties in an array of objects
                 * @param  {array} arr an array of objects
                 * @return {object}     the object where each property is the
                 *                          summed value
                 */
                const sum = (arr) => {
                    return _.reduce(arr, (res, obj) => {
                        return _.mapValues(obj, (val, key) => {
                            res[key] = res[key] || 0;
                            return res[key] + val;
                        });
                    }, {});
                };

                /**
                 * divide each value of an object by divisor
                 * @param  {object} obj the obect to operate on
                 * @param  {int}    divisor the number by which to divide
                 * @return {object}     a new object where each property is the
                 *                        result of the division
                 */
                const divide = (obj, divisor) => {
                    return _.mapValues(obj, (val) => {
                        if (divisor === 0) {
                            return 0;
                        }

                        return val / divisor;
                    });
                };

                const results = _.map(analyses, 'result');
                return divide(sum(results), results.length);
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
                    return actualAverage.should.eql(expectedAverage);
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

            return apiClient.coinstac.consortia.fetch({ id: mockConsortia[0]._id })
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
