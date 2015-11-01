'use strict';

const config = require('config');
const _ = require('lodash');
const dbMap = require(config.get('dbMapPath'));

const appName = 'nodeApi';
const env = process.env.COINS_ENV;
const globalDefaults = dbMap._default;
const appDefaults = dbMap._apps[appName];

/**
 * get DB connection parameters, based on COINS_ENV environment var
 * @return {object} DB connection parameters
 */
function getDbConfig() {
    let envAppDefaults;
    let envDefaults;
    if (dbMap[process.env.COINS_ENV] === undefined) {
        throw new Error(
            `unrecognised database environment: '${process.env.COINS_ENV}'`
        );
    }

    envDefaults = dbMap[env]._default || {};
    envAppDefaults = dbMap[env][appName];
    return _.merge(globalDefaults, appDefaults, envDefaults, envAppDefaults);
}

module.exports = getDbConfig;
