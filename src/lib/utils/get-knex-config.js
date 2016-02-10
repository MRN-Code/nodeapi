'use strict';

var dbConfig = require('./get-db-config.js')();

/**
 * get config object for Knex DB connection, including connection params
 * @return {object} config object
 */
function getKnexConfig() {
    return {
        debug: false,
        client: 'pg',
        connection: {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.username,
            password: dbConfig.password,
            database: dbConfig.db
        },
        pool: {
            min: 1,
            max: 10
        }
    };
}

module.exports = getKnexConfig;
