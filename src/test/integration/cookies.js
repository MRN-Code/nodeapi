'use strict';

const chai = require('chai');
const serverReady = require('../utils/get-server.js');
const initApiClient = require('../utils/init-api-client.js');
const cookieUtils = require('../../lib/utils/cas-cookie-utils.js');
const baseUrl = 'http://localhost/auth/cookies';
/* jscs: disable */
const expiredCookie = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6Im1vY2hhdGVzdCIsImlkIjoiNDY4NmQxZTYtOGZkYS00NjhiLTg0MDUtMDQzNmU2NTljMWNhIiwiaWF0IjoxNDM3OTQ3MTIyLCJleHAiOjE0Mzc5NDg5MjJ9.O8HCYEe0S5lQ5dZPNoEcrrr3yFpyXUN3Mm7BJbxeaYI'; //jshint ignore:line
/* jscs: enable */
let apiClient;
let server;
let cookie;
let parsedCookie;
let credentials;

const studyRolesMock = ['pi', 'coordinator'];

/**
 * set the apiClient variable inside the parent closure
 * @param  {object} client an initialized API Client
 * @return {object}        the same API Client
 */
const setApiClient = function(client) {
    apiClient = client;
    return client;
};

const setServer = function(hapiServer) {
    server = hapiServer;
    return hapiServer;
};

/**
 * extract the cookie value from the set-cookie header
 * @param  {string} rawCookie is the value of the set-cookie header
 * @return {string}           the actual value of the cookie
 */
function getCasCookieValue(rawCookie) {
    const cookieName = cookieUtils.cookieName;
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
        return serverReady
            .then(setServer)
            .then(initApiClient)
            .then(setApiClient)
            .then(login)
            .then((response) => {
                const rawCookies = response.headers['set-cookie'];
                cookie = getCasCookieValue(rawCookies[0]);
                credentials = response.data.data[0];

                return cookieUtils.verifyAndParse(cookie,
                    server.plugins['hapi-redis'].client);
            }).then((parsed) => {

                parsedCookie = parsed;
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
                    return apiClient.auth.setAuthCredentials(oldCredentials);
                });

        };

        const sendRequest = () => {
            const method = 'GET';
            const url = baseUrl + '/' + cookie;
            const request = {
                method: method,
                url: url,
                headers: apiClient.auth.generateHawkHeader(url, method).field
            };
            return server.injectThen(request).then((response) => {
                response.statusCode.should.equal(401);
                return response;
            });
        };

        const credentials = apiClient.auth.getAuthCredentials();
        return logoutThenResetOldCredentials(credentials)
            .then(sendRequest);
    });

    describe('Test cookie roles', () => {
        it('Should contain the studyRoles for user mochatest', () => {
            parsedCookie.should.have.property('studyRoles');
            parsedCookie.studyRoles.should.have.property(8320);
            parsedCookie.studyRoles[8320].should.have.members(studyRolesMock);
        });
    });

});
