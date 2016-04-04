'use strict';

const config = require('config');
const _ = require('lodash');
const globalDbMap = require(config.get('dbMapPath'));
const fs = require('fs');
const localDbMapPath = config.get('dbMapPath').replace('.json', '.local.json');

const appName = 'nodeApi';
const env = process.env.COINS_ENV || process.env.NODE_ENV;

/**
 * get DB connection parameters, based on COINS_ENV environment var
 * @return {object} DB connection parameters
 */
function getDbConfig() {
    let envAppDefaults;
    let envDefaults;
    let dbMap;
    let globalDefaults;
    let appDefaults;
    let localDbMap = {};

    try {
        fs.accessSync(localDbMapPath);
        localDbMap = require(localDbMapPath);
        console.log('Using local custom dbmap.json');
    } catch (e) {
        console.log('Using default dbmap.json');
    }

    dbMap = _.merge(globalDbMap, localDbMap);

    if (dbMap[env] === undefined) {
        throw new Error(
            `unrecognised database environment: '${env}'`
        );
    }

    globalDefaults = dbMap._default;
    appDefaults = dbMap._apps[appName];
    envDefaults = dbMap[env]._default || {};
    envAppDefaults = dbMap[env][appName];
    return _.merge(globalDefaults, appDefaults, envDefaults, envAppDefaults);
}

module.exports = getDbConfig;
