'use strict';

const chai = require('chai');
const server = require('../../');
const authUtils = require('../utils/authentication.js');

let credentials;

// Set should property of all objects for BDD assertions
chai.should();

describe('Login Route', () => {
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered;
    });

    describe('Unsuccessul login', () => {
        let responsePromise;

        before('Attempt to login', () => {
            responsePromise = authUtils.login(server, 'wrongUser', 'wrongPwd')
                .catch((err) => {
                    return err.data;
                });
            return responsePromise;
        });

        it('should respond with 401 if username or pwd are incorrect', () => {
            return responsePromise.then((response) => {
                //should have thrown an error;
                response.statusCode.should.equal(401);
                return response;
            });
        });
    });

    describe('Successful login', () => {
        let responsePromise;
        before(() => {
            responsePromise = authUtils.login(server, 'mochatest', 'mocha');
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
                credentials = JSON.parse(response.payload).data[0];
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
