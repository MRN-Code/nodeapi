'use strict';

const hapi = require('hapi');
const chai = require('chai');
const boom = require('boom');
const config = require('config');

const expect = chai.expect;
let server;

// Add `should` property to all objects for BDD syntax
chai.should();

/**
 * validate response format
 * @param  {object} result the `response.result` from `server.inject`
 * @return {null}   will throw errors if validation is incorrect
 */
function verifyResponseFormat(result) {
    result.should.be.an('object');
    result.should.have.property('data');
    result.should.have.property('error');
    result.data.should.be.an('array');
    if (result.error !== null) {
        result.error.should.be.an('object');
        result.error.should.have.property('statusCode');
        result.error.should.have.property('message');
        result.error.should.have.property('error');
    }
}

describe('responseFormatter', () => {
    before('Initialize test hapi server', (done) => {
        server = new hapi.Server();
        server.connection({
            labels: ['http'],
            port: config.get('httpPort')
        });

        server.route({
            path: '/error',
            method: 'GET',
            config: {
                handler: (request, reply) => {
                    reply(new Error('Mocha test error'));
                }
            }
        });
        server.route({
            path: '/boom',
            method: 'GET',
            config: {
                handler: (request, reply) => {
                    reply(boom.unauthorized('Mocha unauthorized error'));
                }
            }
        });

        server.route({
            path: '/array',
            method: 'GET',
            config: {
                handler: (request, reply) => {
                    reply(['mocha', 'test', 'array']);
                }
            }
        });

        server.route({
            path: '/object',
            method: 'GET',
            config: {
                handler: (request, reply) => {
                    reply({key: 'some mochat test object'});
                }
            }
        });

        server.register([
            require('inject-then'),
            require('../../lib/utils/response-formatter.js')
        ], (err) => {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

    it('Should format an internal error correctly', () => {
        const request = {
            url: 'http://localhost/error',
            method: 'GET'
        };

        return server.injectThen(request). then((response) => {
            verifyResponseFormat(response.result);
            response.statusCode.should.equal(500);
        });
    });

    it('Should format a custom error correctly', () => {
        const request = {
            url: 'http://localhost/boom',
            method: 'GET'
        };

        return server.injectThen(request). then((response) => {
            const expectedMessage = 'Mocha unauthorized error';
            verifyResponseFormat(response.result);
            response.statusCode.should.equal(401);
            response.result.error.message.should.equal(expectedMessage);
        });
    });

    it('Should format an array response properly', () => {
        const request = {
            url: 'http://localhost/array',
            method: 'GET'
        };

        return server.injectThen(request). then((response) => {
            verifyResponseFormat(response.result);
            response.statusCode.should.equal(200);
            expect(response.result.error).to.be.null; //jshint ignore:line
        });
    });

    it('Should format an object response properly', () => {
        const request = {
            url: 'http://localhost/object',
            method: 'GET'
        };

        return server.injectThen(request). then((response) => {
            verifyResponseFormat(response.result);
            response.statusCode.should.equal(200);
            expect(response.result.error).to.be.null; //jshint ignore:line
        });
    });

});
