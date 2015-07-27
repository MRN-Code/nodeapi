'use strict';

const hawk = require('hawk');
const chai = require('chai');
const config = require('config');
const server = require('../../');

const baseUrl = 'http://localhost/auth/cookies';
/* jscs: disable */
const expiredCookie = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6Im1vY2hhdGVzdCIsImlkIjoiNDY4NmQxZTYtOGZkYS00NjhiLTg0MDUtMDQzNmU2NTljMWNhIiwiaWF0IjoxNDM3OTQ3MTIyLCJleHAiOjE0Mzc5NDg5MjJ9.O8HCYEe0S5lQ5dZPNoEcrrr3yFpyXUN3Mm7BJbxeaYI'; //jshint ignore:line
/* jscs: enable */
let cookie;
let credentials;

// Set should property of all objects for BDD assertions
chai.should();

/**
 * generate the authentication header expected by login route
 * @param  {string} username
 * @param  {string} password
 * @return {string} The complete authorization header value
 */
function generateAuthHeader(username, password) {
    return [
        'Basic',
        (new Buffer(`${username}:${password}`)).toString('base64')
    ].join(' ');
}

/**
 * generate the header expected by Hawk.
 * Uses the `credentials` var in the parent closure.
 * @param  {string} url
 * @param  {string} method e.g. 'GET'
 * @return {string} The hawk auth signature
 */
function generateHawkHeader(url, method) {
    return hawk.client.header(url, method, { credentials: credentials });
}

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

describe('Cookies', () => {
    let responsePromise;
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered.then(() => {
            const authHeader = generateAuthHeader('mochatest', 'mocha');
            const request = {
                method: 'GET',
                url: 'http://localhost/auth/login',
                headers: {
                    Authorization: authHeader
                }
            };
            responsePromise = server.injectThen(request)
                .then((response) => {
                    const rawCookies = response.headers['set-cookie'];
                    cookie = getCasCookieValue(rawCookies[0]);
                    credentials = JSON.parse(response.payload).data[0];
                });

            return responsePromise;
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
        const url = 'http://localhost/auth/logout/' + credentials.id;
        const header = generateHawkHeader(url, 'GET');
        const request = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: header.field
            }
        };
        responsePromise = server.injectThen(request).then(() => {
            const request = {
                method: 'GET',
                url: baseUrl + '/' + cookie
            };
            return server.injectThen(request).then((response) => {
                response.statusCode.should.equal(401);
            });
        });
        return responsePromise;
    });

});
