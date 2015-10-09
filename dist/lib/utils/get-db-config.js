'use strict';

var config = require('config');
var dbMap = require(config.get('dbMapPath'));
var dbConfig;

var envMap = {
    production: 'prd',
    staging: 'training',
    development: 'dev'
};

/**
 * get DB connection parameters, based on COINS_ENV environment var
 * @return {object} DB connection parameters
 */
function getDbConfig() {
    if (dbConfig === undefined) {
        if (envMap[process.env.COINS_ENV] !== undefined) {
            dbConfig = dbMap[envMap[process.env.COINS_ENV]].nodeApi;
        } else {
            throw new Error('unrecognised database environment: \'' + process.env.COINS_ENV + '\'');
        }
    }

    return dbConfig;
}

module.exports = getDbConfig;