'use strict';

const chai = require('chai');
const Bluebird = require('bluebird');
const serverReady = require('../utils/get-server.js');
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
        return serverReady
            .then(initApiClient)
            .then(setApiClient);
    });

    describe('Unsuccessul login', () => {
        it('should respond with 401 if username or pwd are incorrect', () => {
            const handleAuthError = (err) => {
                return err;
            };

            return apiClient.auth.login('wrongUser', 'wrongPwd')
                .catch(handleAuthError)
                .then((response) => {
                    //should have thrown an error;
                    response.status.should.equal(401);
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
                    response.status.should.eql(200);
                    return response;
                });
        });

        it('Should should return a hawk auth object in payload', () => {
            return loginPromise
                .then((response) => {
                    credentials = response.data.data[0];
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
                    headers['set-cookie'].should.to.match(/^CAS_Auth_User-/);
                    return response;
                });
        });
    });
});

describe('DELETE keys (logout)', () => {
    before('wait for server to be ready', () => {
        return serverReady;
    });

    describe('Successful logout', () => {
        let responsePromise;
        let credentials;
        before('Login first, then logout', () => {
            responsePromise = apiClient.auth.login('mochatest', 'mocha')
                .then(() => {
                    credentials = apiClient.auth.getAuthCredentials();
                    return apiClient.auth.logout();
                });

            return responsePromise;
        });

        it('Should respond with 200 OK', () => {
            return responsePromise
                .then((response) => {
                    response.status.should.equal(200);
                    return response;
                });
        });

        it('Should expire auth cookie', () => {
            return responsePromise
                .then((response) => {
                    const headers = response.headers;
                    headers.should.have.property('set-cookie');
                    headers['set-cookie'].should.to.match(/^CAS_Auth_User-/);
                    headers['set-cookie'].should.match(/LOGGEDOUT/);
                    return response;
                });

        });

        it('Should unset the hawk key in the key store', () => {
            return responsePromise
                .then((response) => {
                    return serverReady.then((server) => {
                        const redisClient = server.plugins['hapi-redis'].client;
                        return new Bluebird((res, rej) => {
                            const id = credentials.id;
                            redisClient.hgetall(id, (result) => {
                                const errMsg = 'Hawk id should not still exist';
                                if (result !== null) {
                                    rej(new Error(errMsg));
                                    return;
                                }

                                res(response);
                            });
                        });

                    });
                });
        });

        it('Should prohibit access to restricted resources');
    });

    describe('Already logged out', () => {
        let loggedInAndOut = false;
        let responsePromise;
        let credentials;
        before(() => {
            const callLogout = () => {
                credentials = apiClient.auth.getAuthCredentials();
                return apiClient.auth.logout();
            };

            const callLogoutAgain = () => {

                // simulate being logged in still by re-setting creds
                apiClient.auth.setAuthCredentials(credentials);
                loggedInAndOut = true;
                return apiClient.auth.logout();
            };

            responsePromise = apiClient.auth.login('mochatest', 'mocha')
                .then(callLogout)
                .catch((err) => {
                    return err;
                })
                .then(callLogoutAgain);

            return responsePromise;
        });

        it('Should respond with 401 unauthorized', () => {
            return responsePromise
                .then((response) => {
                    loggedInAndOut.should.equal(true);
                    response.status.should.equal(401);
                    return response;
                });
        });
    });
});
