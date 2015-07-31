'use strict';

const internals = {
    hawk: require('hawk'),
    state: {
        credentials: null
    }
};

const baseUrl = 'http://localhost:3000/auth';

/**
 * generate the header expected by Hawk.
 * Uses the `internals.state.credentials` var in the parent closure.
 * Note that the url must include a protocol and hostname
 * @param  {string} url
 * @param  {string} method e.g. 'GET'
 * @return {string} The hawk auth signature
 */
function generateHawkHeader(url, method) {
    const creds = internals.state.credentials;
    return internals.hawk.client.header(url, method, { credentials: creds });
}

/**
 * generate the authentication payload expected by POST /auth/keys route
 * @param  {string} username
 * @param  {string} password
 * @return {object} object to be sent as POST data to /auth/keys
 */
function generateAuthPayload(username, password) {
    return {
        username: new Buffer(username). toString('base64'),
        password: new Buffer(password). toString('base64')
    };
}

/**
 * attempt to login to the API. This sets the API credentials
 * @param  {Server} server   is a hapi server instance
 * @param  {string} username is the username to login with
 * @param  {string} password is the password to login with
 * @return {Promise}         a promise that resolves to server response
 *                           or rejects with an error, where error.data contains
 *                           the full response object
 */
function login(server, username, password) {
    const authPayload = generateAuthPayload(username, password);
    const request = {
        method: 'POST',
        url: baseUrl + '/keys',
        payload: authPayload
    };
    const responsePromise = server.injectThen(request)
        .then((response) => {
            let err;
            if (response.statusCode !== 200) {
                err = new Error(response.result.error.message);
                err.data = response;
                throw err;
            } else {
                internals.state.credentials = response.result.data[0];
            }

            return response;
        });

    return responsePromise;
}

/**
 * logout of the application
 * @param  {Server} server a hapi Server instance
 * @param  {string} id     (optional) is the id to logout.
 *                         defaults to the currently logged in ID.
 * @return {Promise}       a promise that resolves to server response
 *                         or rejects with an error, where error.data contains
 *                         the full response object
 */
function logout(server, id) {
    id = id || internals.state.credentials.id;
    const url = baseUrl + '/keys/' + id;
    const method = 'DELETE';
    const header = generateHawkHeader(url, method);
    const request = {
        method: method,
        url: url,
        headers: {
            Authorization: header.field
        }
    };
    const responsePromise = server.injectThen(request)
        .then((response) => {
            let err;
            if (response.statusCode !== 200) {
                err = new Error(response.result.error.message);
                err.data = response;
                throw err;
            }

            return response;
        });

    return responsePromise;
}

/**
 * set the hawk credentials
 * @param {any} val value to set credentials to.
 */
function setCredentials(val) {
    internals.state.credentials = val;
    return val;
}

/**
 * get the internally stored credentials
 * @return {object} HAWK credentials object, or null if not set
 */
function getCredentials() {
    return internals.state.credentials;
}

module.exports.login = login;
module.exports.logout = logout;
module.exports.setCredentials = setCredentials;
module.exports.getCredentials = getCredentials;
module.exports.generateHawkHeader = generateHawkHeader;
module.exports.generateAuthPayload = generateAuthPayload;
