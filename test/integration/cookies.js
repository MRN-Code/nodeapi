'use strict';

const chai = require('chai');
const config = require('config');
const server = require('../../');
const initApiClient = require('../utils/init-api-client.js');
const pkg = require('../../package.json');
const baseUrl = 'http://localhost/api/v' + pkg.version + '/auth/cookies';
/* jscs: disable */
const expiredCookie = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6Im1vY2hhdGVzdCIsImlkIjoiNDY4NmQxZTYtOGZkYS00NjhiLTg0MDUtMDQzNmU2NTljMWNhIiwiaWF0IjoxNDM3OTQ3MTIyLCJleHAiOjE0Mzc5NDg5MjJ9.O8HCYEe0S5lQ5dZPNoEcrrr3yFpyXUN3Mm7BJbxeaYI'; //jshint ignore:line
/* jscs: enable */
let apiClient;
let cookie;
let credentials;

/**
 * set the apiClient variable inside the parent closure
 * @param  {object} client an initialized API Client
 * @return {object}        the same API Client
 */
const setApiClient = function(client) {
    apiClient = client;
    return client;
};

/**
 * extract the cookie value from the set-cookie header
 * @param  {string} rawCookie is the value of the set-cookie header
 * @return {string}           the actual value of the cookie
 */
function getCasCookieValue(rawCookie) {
    const cookieName = config.get('casCookieName');
    const regex = new RegExp('^' + cookieName + '=([^;]*);');
    cookie = rawCookie.match(regex)[1];
    return cookie;
}

/**
 * convenience function to login with a working username and pwd
 * @return {Promise} resolves to login response
 */
function login() {
    return apiClient.auth.login('mochatest', 'mocha');
}

// Set should property of all objects for BDD assertions
chai.should();

describe('Cookies', () => {
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient)
            .then(login)
            .then((response) => {
                const rawCookies = response.headers['set-cookie'];
                cookie = getCasCookieValue(rawCookies[0]);
                credentials = response.body.data[0];
                return;
            });
    });

    it('Should respond with 400 for invalid cookies', () => {
        const request = {
            method: 'GET',
            url: baseUrl + '/InvalidCookieString'
        };
        return server.injectThen(request).then((response) => {
            response.statusCode.should.equal(400);
        });
    });

    it('Should respond with 401 for expired cookies', () => {
        const request = {
            method: 'GET',
            url: baseUrl + '/' + expiredCookie
        };
        return server.injectThen(request).then((response) => {
            response.statusCode.should.equal(401);
        });
    });

    it('Should respond with 200 and new cookie val for valid cookies', () => {
        const request = {
            method: 'GET',
            url: baseUrl + '/' + cookie
        };
        return server.injectThen(request).then((response) => {
            response.statusCode.should.equal(200);
        });
    });

    it('Should respond with 401 after logout', () => {
        const logoutThenResetOldCredentials = (oldCredentials) => {
            return apiClient.auth.logout()
                .then(() => {
                    return apiClient.setAuthCredentials(oldCredentials);
                });

        };

        const sendRequest = () => {
            const method = 'GET';
            const url = baseUrl + '/' + cookie;
            const request = {
                method: method,
                url: url,
                headers: apiClient.generateHawkHeader(url, method).field
            };
            return server.injectThen(request).then((response) => {
                response.statusCode.should.equal(401);
                return response;
            });
        };

        return apiClient.getAuthCredentials()
            .then(logoutThenResetOldCredentials)
            .then(sendRequest);
    });

});
