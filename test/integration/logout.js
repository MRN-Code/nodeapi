'use strict';

const chai = require('chai');
const server = require('../../');
const authUtils = require('../utils/authentication.js');

// Set should property of all objects for BDD assertions
chai.should();

describe('Logout Route', () => {
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered;
    });

    describe ('Successful logout', () => {
        let responsePromise;
        before('Login first, then logout', () => {
            responsePromise = authUtils.login(server, 'mochatest', 'mocha')
                .then(() => {
                    return authUtils.logout(server);
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
                    const id = authUtils.getCredentials().id;
                    redisClient.hgetall(id, (result) => {
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

    describe ('Already logged out', () => {
        let loggedInAndOut = false;
        let responsePromise;
        before(() => {
            responsePromise = authUtils.login(server, 'mochatest', 'mocha')
                .then(() => {
                    return authUtils.logout(server);
                })
                .then(() => {
                    loggedInAndOut = true;
                    return authUtils.logout(server);
                })
                .catch((err) => {
                    return err.data;
                });

            return responsePromise;
        });

        it('Should respond with 401 unauthorized', () => {
            return responsePromise.then((response) => {
                loggedInAndOut.should.equal(true);
                response.statusCode.should.equal(401);
                return response;
            });
        });
    });
});
