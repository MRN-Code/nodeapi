'use strict';

var dbConfig = require('./get-db-config.js')();

function getKnexConfig() {
    return {
        debug: true,
        client: 'pg',
        connection: {
            host: dbConfig.host,
            port: 5432,
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
