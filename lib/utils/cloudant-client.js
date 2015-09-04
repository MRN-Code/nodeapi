'use strict';

const config = require('config');
const axios = require('axios');
const _ = require('lodash');

const internals = {};
const client = {};


/**
 * Get the cloudant API URL for the given db
 * @param  {string} db name of the DB
 * @return {string}    the API URL for the DB
 */
internals.getDbUrl = (db) => {
    return internals.baseUrl + db + '/';
};

/**
 * Get the cloudant API security endpoint for the given db
 * @param  {string} db name of the DB
 * @return {string}    the API URL for the DB
 */
internals.getSecurityUrl = (db) => {
    return internals.getDbUrl(db) + '_security';
};

/**
 * Initialize the client, setting the authentication header
 * @return {object} the client
 */
client.init = () => {
    if (config.has('coinstac.pouchdb.cloudant')) {
        const key = config.get('coinstac.pouchdb.cloudant.key');
        const authHeader = 'Basic' +  ' ' + key;
        if (!key) {
            throw new Error('No cloudant key found');
        }

        internals.hostname = config.get('coinstac.pouchdb.cloudant.hostname');
        internals.baseUrl = 'https://' + internals.hostname + '/_api/v2/db/';
        internals.headers = { Authorization: authHeader };
        return client;
    } else {
        throw new Error('Cannot initialize cloudantClient without config');
    }
};

/**
 * Set the security for the DB
 * @param  {string} db       the name of the DB
 * @param  {object} security a security object listing username and privs
 *                           see https://docs.cloudant.com/authorization.html
 * @return {Promise}         resolves with the result
 */
client.setSecurity = (db, security) => {

    const requestConfig = {
        url: internals.getSecurityUrl(db),
        headers: internals.headers,
        method: 'PUT',
        data: { cloudant: security }
    };

    return axios(requestConfig);
};

/**
 * Get the security for the DB
 * @param  {string} db       the name of the DB
 * @return {Promise}         resolves with the security rules
 */
client.getSecurity = (db) => {

    const requestConfig = {
        url: internals.getSecurityUrl(db),
        headers: internals.headers,
        method: 'GET'
    };

    return axios(requestConfig)
        .then((response) => {
            return response.data.cloudant;
        });
};

/**
 * Merging the given security with existing security rules
 * @param  {string} db       the name of the DB
 * @param  {object} security a security object listing username and privs
 *                           see https://docs.cloudant.com/authorization.html
 * @return {Promise}         resolves with the result
 */
client.mergeSecurity = (db, security) => {

    return client.getSecurity(db)
        .then(_.partial(_.defaults, security))
        .then(_.partial(client.setSecurity, db));
};

module.exports = client;
