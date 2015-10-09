'use strict';

var config = require('config');
var axios = require('axios');
var _ = require('lodash');

var internals = {};
var client = {};

/**
 * Get the cloudant API URL for the given db
 * @param  {string} db name of the DB
 * @return {string}    the API URL for the DB
 */
internals.getDbUrl = function (db) {
    return internals.baseUrl + db + '/';
};

/**
 * Get the cloudant API security endpoint for the given db
 * @param  {string} db name of the DB
 * @return {string}    the API URL for the DB
 */
internals.getSecurityUrl = function (db) {
    return internals.getDbUrl(db) + '_security';
};

/**
 * Initialize the client, setting the authentication header
 * @return {object} the client
 */
client.init = function () {
    if (config.has('coinstac.pouchdb.cloudant')) {
        var key = config.get('coinstac.pouchdb.cloudant.key');
        var authHeader = 'Basic' + ' ' + key;
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
client.setSecurity = function (db, security) {

    var requestConfig = {
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
client.getSecurity = function (db) {

    var requestConfig = {
        url: internals.getSecurityUrl(db),
        headers: internals.headers,
        method: 'GET'
    };

    return axios(requestConfig).then(function (response) {
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
client.mergeSecurity = function (db, security) {

    return client.getSecurity(db).then(_.partial(_.defaults, security)).then(_.partial(client.setSecurity, db));
};

module.exports = client;