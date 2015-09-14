/*
 * This file is required by grunt when running tests.
 * It modifies the databse config for coinstac so that all reads/writes
 * Are done in memory, and discarded when finished.
 */

process.env.ALLOW_CONFIG_MUTATIONS = true;
const cliOpts = require('../../lib/utils/cli-options.js');
cliOpts.coinstac = true;
const config = require('config');
const _ = require('lodash');
const origConfig = config.get('coinstac.pouchdb');
const testConfig = {
    consortiaMeta: {
        conn: false, //necessary to override default
        pouchConfig: { db: require('memdown') }
    },
    consortia: {
        conn: false, //necessary to override default
        pouchConfig: { db: require('memdown') }
    }
};

config.coinstac.pouchdb = _.defaultsDeep(testConfig, origConfig);
