'use strict';

const hawk = require('hawk');
const chai = require('chai');
const server = require('../../');

const url = 'http://localhost/auth/login';
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

describe('Login Route', () => {
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered;
    });

    describe('Unsuccessul login', () => {
        let responsePromise;
        before('Attempt to login', () => {
            const authHeader = generateAuthHeader('wrongUser', 'wrongPwd');
            const request = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: authHeader
                }
            };
            responsePromise = server.injectThen(request);
            return responsePromise;
        });

        it('should respond with 401 if username or pwd are incorrect', () => {
            return responsePromise.then((response)=> {
                response.statusCode.should.equal(401);
                return response;
            });
        });
    });

    describe('Successful login', () => {
        let responsePromise;
        before(() => {
            const authHeader = generateAuthHeader('mochatest', 'mocha');
            const request = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: authHeader
                }
            };
            responsePromise = server.injectThen(request);
            return responsePromise;
        });

        it('Should return status-code 200', () => {
            return responsePromise.then((response) => {
                response.statusCode.should.to.eql(200);
                return response;
            });
        });

        it('Should should return a hawk auth object in payload', () => {
            return responsePromise.then((response) => {
                credentials = JSON.parse(response.payload);
                credentials.should.to.be.instanceOf(Object);
                credentials.should.to.have.property('id');
                credentials.should.to.have.property('key');
                credentials.should.to.have.property('algorithm');
                credentials.should.to.have.property('issueTime');
                credentials.should.to.have.property('expireTime');
                return response;
            });
        });

        it('Should should set a CAS_Auth_User cookie', () => {
            return responsePromise.then((response) => {
                const headers = response.headers;
                headers.should.to.have.property('set-cookie');
                headers['set-cookie'].should.to.match(/^CAS_Auth_User=/);
                return response;
            });
        });
    });
});
