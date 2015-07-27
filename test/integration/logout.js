'use strict';

const hawk = require('hawk');
const chai = require('chai');
const server = require('../../');

const baseUrl = 'http://localhost/auth/logout';
let credentials;

// Set should property of all objects for BDD assertions
chai.should();

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

describe('Logout Route', () => {
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered;
    });

    describe ('Already logged out', () => {
        const url = baseUrl + '/invalidHawkId';
        let responsePromise;
        before(() => {
            const header = generateHawkHeader(url, 'GET');
            const request = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: header.field
                }
            };
            responsePromise = server.injectThen(request);
            return responsePromise;
        });

        it('Should respond with 401 unauthorized', () => {
            return responsePromise.then((response) => {
                response.statusCode.should.equal(401);
                return response;
            });
        });

    });

    describe ('Successful logout', () => {
        let responsePromise;
        before('Login first, then logout', () => {
            const authHeader = generateAuthHeader('mochatest', 'mocha');
            const request = {
                method: 'GET',
                url: 'http://localhost/auth/login',
                headers: {
                    Authorization: authHeader
                }
            };
            responsePromise = server.injectThen(request).then((response) => {
                credentials = JSON.parse(response.payload).data[0];
            }).then(() => {
                const url = baseUrl + '/' + credentials.id;
                const header = generateHawkHeader(url, 'GET');
                const request = {
                    method: 'GET',
                    url: url,
                    headers: {
                        Authorization: header.field
                    }
                };
                responsePromise = server.injectThen(request);
                return responsePromise;
            });

            return responsePromise;
        });

        it('Should respond with 200 OK', () => {
            return responsePromise.then((response) => {
                response.statusCode.should.equal(200);
                return response;
            });

        });

        it('Should expire auth cookie', () => {
            return responsePromise.then((response) => {
                const headers = response.headers;
                headers.should.have.property('set-cookie');
                headers['set-cookie'].should.to.match(/^CAS_Auth_User=/);
                headers['set-cookie'].should.match(/LOGGEDOUT/);
                return response;
            });

        });

        it('Should unset the hawk key in the key store', () => {
            return responsePromise.then((response) => {
                const redisClient = server.plugins['hapi-redis'].client;
                return new Promise((res, rej) => {
                    redisClient.hgetall(credentials.id, (result) => {
                        if (result !== null) {
                            rej(new Error('Hawk key should no longer exist'));
                            return;
                        }

                        res(response);
                    });
                });
            });
        });

        it('Should prohibit access to restricted resources');
    });

});
