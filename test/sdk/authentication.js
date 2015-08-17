'use strict';

const baseUri = '/auth';

let me;

/**
 * Set me.btoa for base64 encoding in a browser-compatible way.
 * IE < 10 not supported
 * @return {object} me
 */
function setBtoa() {
    if (typeof btoa === 'function') {
        //we are in browser, and btoa will be defined for us
        me.btoa = btoa;
    } else if (typeof Buffer === 'function') {
        //probably in Node.js environment
        me.btoa = (str) => {
            return new Buffer(str).toString('base64');
        };
    } else {
        throw new Error('Envonment unsupported: need `btoa` or `Buffer`');
    }

    return me;
}

/**
 * generate the authentication payload expected by POST /auth/keys route
 * @param  {string} username
 * @param  {string} password
 * @return {object} object to be sent as POST data to /auth/keys
 */
function generateLoginPayload(username, password) {
    return {
        username: me.btoa(username),
        password: me.btoa(password)
    };
}

/**
 * attempt to login to the API. This sets the API credentials
 * @param  {string} username is the username to login with
 * @param  {string} password is the password to login with
 * @return {Promise}         a promise that resolves to server response
 *                           or rejects with an error, where error.data contains
 *                           the full response object
 */
function login(username, password) {
    const authPayload = generateLoginPayload(username, password);
    const request = {
        method: 'POST',
        uri: baseUri + '/keys',
        body: authPayload
    };
    return me.makeRequest(request, false)
        .then((response) => {
            let err;
            if (response.statusCode !== 200) {
                err = new Error(response.body.error.message);
                err.data = response;
                throw err;
            } else {
                return me.setAuthCredentials(response.body.data[0])
                    .then(() => { return response; });
            }
        });
}

/**
 * logout of the application
 * @param  {string} id     (optional) is the id to logout.
 *                         defaults to the currently logged in ID.
 * @return {Promise}       a promise that resolves to server response
 *                         or rejects with an error, where error.data contains
 *                         the full response object
 */
function logout(id) {
    /**
     * set options and send request
     * @param  {object} credentials hawk credentials object
     * @return {Promise}             resolves to response
     */
    const sendRequest = (credentials) => {
        id = id || credentials.id;
        const uri = baseUri + '/keys/' + id;
        const method = 'DELETE';
        const request = {
            method: method,
            uri: uri
        };
        return me.makeRequest(request, true);
    };

    /**
     * handle response from server: throwing an error if needed
     * also unsets the local store of credentials
     * @param  {object} response the response sent back from the server
     * @return {Promise}          resolves to the response object
     */
    const handleResponse = (response) => {
        const loggedOutCreds = { status: 'logged out', date: Date.now() };
        let err;

        /**
         * convenience function to return the response
         * @return {object} response object
         */
        const returnResponse = () => {
            return response;
        };

        if (response.statusCode !== 200) {
            err = new Error(response.body.error.message);
            err.data = response;
            throw err;
        }

        return me.setAuthCredentials(loggedOutCreds)
            .then(returnResponse);
    };

    return me.getAuthCredentials()
        .then(sendRequest)
        .then(handleResponse);
}

/**
 * initialize the internals with the config from index.js
 * @param  {object} config the config object from index.js
 * @return {null}        nothing
 */
function init(base) {
    me = base;
    setBtoa();
    return {
        login: login,
        logout: logout
    };
}

module.exports = init;
