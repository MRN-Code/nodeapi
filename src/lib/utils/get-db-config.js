'use strict';

const config = require('config');
const dbMap = require(config.get('dbMapPath'));
const _ = require('lodash');

const envMap = {
    production: 'prd',
    staging: 'training',
    development: 'dev'
};

/**
 * get DB connection parameters, based on COINS_ENV environment var
 * @return {object} DB connection parameters
 */
function getDbConfig() {
    let dbConfig;
    let dbDefaults;
    const env = envMap[process.env.COINS_ENV];
    if (dbConfig === undefined) {
        dbDefaults = dbMap.default;
        if (envMap[process.env.COINS_ENV] !== undefined) {
            dbConfig = dbMap[env].nodeApi;
            return _.defaults(dbConfig, dbDefaults);
        } else {
            throw new Error(
                `unrecognised database environment: '${process.env.COINS_ENV}'`
            );
        }
    } else {
        throw new Error(
            `could not load database config at '${config.get('dbMapPath')}'`
        );
    }

}

module.exports = getDbConfig;
