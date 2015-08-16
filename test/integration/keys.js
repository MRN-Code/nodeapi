'use strict';

const chai = require('chai');
const Bluebird = require('Bluebird');
const server = require('../../');
const initApiClient = require('../utils/init-api-client.js');
let apiClient;
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

// Set should property of all objects for BDD assertions
chai.should();

describe('POST keys (login)', () => {
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient);
    });

    describe('Unsuccessul login', () => {
        it('should respond with 401 if username or pwd are incorrect', () => {
            const handleAuthError = (err) => {
                return err.data;
            };

            return apiClient.auth.login('wrongUser', 'wrongPwd')
                .catch(handleAuthError)
                .then((response) => {
                    //should have thrown an error;
                    response.statusCode.should.equal(401);
                    return response;
                });
        });
    });

    describe('Successful login', () => {
        let loginPromise;
        before('Attempt to login', () => {
            loginPromise  = apiClient.auth.login('mochatest', 'mocha');
            return loginPromise;
        });

        it('Should return status-code 200', () => {
            return loginPromise
                .then((response) => {
                    response.statusCode.should.to.eql(200);
                    return response;
                });
        });

        it('Should should return a hawk auth object in payload', () => {
            return loginPromise
                .then((response) => {
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
            return loginPromise
                .then((response) => {
                    const headers = response.headers;
                    headers.should.to.have.property('set-cookie');
                    headers['set-cookie'].should.to.match(/^CAS_Auth_User=/);
                    return response;
                });
        });
    });
});

describe('DELETE keys (logout)', () => {
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered;
    });

    describe ('Successful logout', () => {
        let responsePromise;
        before('Login first, then logout', () => {
            responsePromise = apiClient.auth.login('mochatest', 'mocha')
                .then(() => {
                    return apiClient.auth.logout();
                });

            return responsePromise;
        });

        it('Should respond with 200 OK', () => {
            return responsePromise
                .then((response) => {
                    response.statusCode.should.equal(200);
                    return response;
                });

        });

        it('Should expire auth cookie', () => {
            return responsePromise
                .then((response) => {
                    const headers = response.headers;
                    headers.should.have.property('set-cookie');
                    headers['set-cookie'].should.to.match(/^CAS_Auth_User=/);
                    headers['set-cookie'].should.match(/LOGGEDOUT/);
                    return response;
                });

        });

        it('Should unset the hawk key in the key store', () => {
            return responsePromise
                .then((response) => {
                    const redisClient = server.plugins['hapi-redis'].client;
                    return new Bluebird((res, rej) => {
                        const id = apiClient.getAuthCredentials().id;
                        redisClient.hgetall(id, (result) => {
                            const errMsg = 'Hawk key should no longer exist';
                            if (result !== null) {
                                rej(new Error(errMsg));
                                return;
                            }

                            res(response);
                        });
                    });
                });
        });

        it('Should prohibit access to restricted resources');
    });

    describe ('Already logged out', () => {
        let loggedInAndOut = false;
        let responsePromise;
        before(() => {
            const callLogout = () => {
                return apiClient.auth.logout();
            };

            const callLogoutAgain = () => {
                loggedInAndOut = true;
                return apiClient.auth.logout();
            };

            responsePromise = apiClient.auth.login('mochatest', 'mocha')
                .then(callLogout)
                .then(callLogoutAgain)
                .catch((err) => {
                    return err.data;
                });

            return responsePromise;
        });

        it('Should respond with 401 unauthorized', () => {
            return responsePromise
                .then((response) => {
                    loggedInAndOut.should.equal(true);
                    response.statusCode.should.equal(401);
                    return response;
                });
        });
    });
});
