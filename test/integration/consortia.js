'use strict';

const chai = require('chai');
const server = require('../../');
const PouchW = require('pouchdb-wrapper');
const _ = require('lodash');
const Bluebird = require('bluebird');
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
    const db = new PouchW({
        name: 'consortia-test',
        pouchConfig: { db: require('memdown') }
    });
    server.plugins.houchdb.consortiaMeta = db;
    return db.clear()
        .then(() => {
            Bluebird.all(_.map(mockConsortia, db.add, db));
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
        it('Adds a new consortium', () => {
            const consortia = {
                label: 'POST test consortium',
                description: 'added as part of integration tests',
                users: [],
                tags: [],
                analyses: []
            };
            return apiClient.coinstac.consortia.create(consortia)
                .then((response) => {
                    const data = response.result.data;
                    data.should.have.property('length');
                    data.length.should.equal(1);
                    data[0].should.have.property('_id');
                    _.forEach(consortia, (val, key) => {
                        data[0].should.have.property(key);
                        data[0][key].should.eql(val);
                    });
                });
        });

        it('Returns the name/path of the database for the consortium');
        it('Adds a pouch/couch Db for the new consortium');

    });

});
