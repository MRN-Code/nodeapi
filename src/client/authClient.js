'use strict';
const getHawkHeader = require('hawk/lib/browser').client.header;

const authKeyId = 'COINS_AUTH_CREDENTIALS';
const url = require('url');

// define base64 encoding function for non-browser environments
// @TODO: avoid shipping authClient with browser bundle
const atob = require('abab/lib/atob');
const btoa = require('abab/lib/btoa');

const authClient = {
    initialized: false,
    credentials: null,

    /**
     * Initialize the authClient
     * @param  {object} apiClient   the apiClient that is being wrapped
     * @param  {object} authStorage the localstorage provider to use for creds
     * @return {object}             the authClient
     */
    init: (apiClient, config) => {
        var authStorage = config.store;
        var xhrAgent = config.xhrAgent;
        apiClient.auth = authClient;
        authClient.authStorage = authStorage;
        authClient.authKeysApi = apiClient.AuthkeysApi;
        authClient.interceptRequests(xhrAgent);
        authClient.initialized = true;
        return authClient;
    },

    /**
     * set up xhr interceptor to add HAWK headers to requests
     * @return {void}
     */
    interceptRequests: (xhrAgent) => {
        const addHawkHeaders = (requestConfig) => {
            if (authClient.getAuthCredentials()) {
                const method = requestConfig.method;

                // add query params to URL
                const urlObj = url.parse(requestConfig.url);
                const query = requestConfig.params;
                urlObj.query = query;
                const urlString = url.format(urlObj);

                const authHeader = authClient.generateHawkHeader(
                    urlString,
                    method
                );
                requestConfig.headers.Authorization = authHeader.field;
            }

            return requestConfig;
        };

        // intercept requests before they are sent and add auth headers
        authClient.xhrInterceptor = xhrAgent.interceptors
            .request.use(addHawkHeaders);
    },

    /**
     * get authentication credentials from cache or localstorage
     * @return {object} credentials object
     */
    getAuthCredentials: () => {

        // return from in-memory if available
        if (!authClient.credentials) {
            // retrieve from persistent storage
            const credBase64 = authClient.authStorage.getItem(authKeyId);
            if (credBase64) {
                const creds = JSON.parse(atob(credBase64));
                authClient.cacheAuthCredentials(creds);
            }
        }

        return authClient.credentials;
    },

    /**
     * set authentication credentials in cache and localstorage
     * localstorage version is base64 encoded for obscurity
     * @TODO: use weak two-way encryption with user-supplied passcode instead
     * @param  {} credentials [description]
     * @return {[type]}             [description]
     */
    setAuthCredentials: (credentials) => {
        authClient.cacheAuthCredentials(credentials);
        authClient.authStorage.setItem(
            authKeyId,
            btoa(JSON.stringify(credentials))
        );
        return authClient.getAuthCredentials();
    },

    /**
     * set plain-text credentials in memory
     * @param  {object} credentials
     * @return {object}             previous cached credentials object
     */
    cacheAuthCredentials: (credentials) => {
        const previousCreds = authClient.credentials;
        authClient.credentials = credentials;
        return previousCreds;
    },

    /**
     * generateHawkHeader for new request using exiting credentials
     * @param  {string} url    url to be requested
     * @param  {string} method method of request
     * @return {object}        hawk header object (header value in header.field)
     */
    generateHawkHeader: (url, method) => {
        const creds = authClient.getAuthCredentials();
        return getHawkHeader(url, method, { credentials: creds });
    },

    /**
     * login with username and pwd and store credentials locally
     * @param  {string} username plain-text username
     * @param  {string} password plain-text
     * @return {Promise}         resolves to credentials object
     */
    login: (username, password) => {
        let rawResponse;
        const extractCredentials = (response) => {
            rawResponse = response;
            return response.data.data[0];
        };

        const returnRawResponse = () => {
            return rawResponse;
        };

        return authClient.authKeysApi.post({
            username: btoa(username),
            password: btoa(password)
        }).then(extractCredentials)
            .then(authClient.setAuthCredentials)
            .then(returnRawResponse);
    },

    /**
     * logout using existing local credentials and remove local creds
     * @return {Promise} resolves to new value of local credentials (null)
     */
    logout: () => {
        let rawResponse;

        const credentials = authClient.getAuthCredentials();

        const handlePostLogout = (response) => {
            rawResponse = response;
            return authClient.setAuthCredentials(null);
        };

        const returnRawResponse = () => {
            return rawResponse;
        };

        return authClient.authKeysApi
        .remove(credentials.id)
        .then(handlePostLogout)
        .then(returnRawResponse);
    },

    /**
     * test whether user is currently logged in
     * @return {Promise} resolves to boolean
     */
    isLoggedIn: () => {
        const credentials = authClient.getAuthCredentials();

        const handleKeysResponse = (response) => {
            return response.status === 200;
        };

        return authClient.authKeysApi.get(credentials.id)
            .then(handleKeysResponse);
    }
};

module.exports = authClient;
