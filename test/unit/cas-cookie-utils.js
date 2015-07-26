'use strict';

const chai = require('chai');
const redis = require('fakeredis');
const _ = require('lodash');
const redisClient = redis.createClient();
const casCookieUtils = require('../../lib/utils/cas-cookie-utils.js');
const credentials = {
    id: 'mochatestId',
    username: 'mochatest',
    key: 'should be hidden'
};

let jwt;

chai.should();

describe('casCookieUtils', () => {
    before((done) => {
        return redisClient.hmset(credentials.id, credentials, done);
    });

    describe('generate', () => {
        it('should return a string', () => {
            jwt = casCookieUtils.generate(credentials);
            jwt.should.be.a('string');
        });

        it('should exclude protected keys from JWT', () => {
            return casCookieUtils.verifyAndParse(jwt, redisClient)
                .then((result) => {
                    result.should.not.have.property('key');
                });
        });
    });

    describe('verifyAndParse', () => {
        it('should return a promise', () => {
            const result = casCookieUtils.verifyAndParse(jwt, redisClient);
            result.should.be.instanceOf(Promise);
        });

        it('should parse a valid jwt', () => {
            return casCookieUtils.verifyAndParse(jwt, redisClient)
                .then((result) => {
                    _.forEach(_.omit(credentials, 'key'), (val, key) => {
                        result.should.have.property(key);
                        result[key].should.equal(val);
                    });
                });
        });

        it('should reject an invalid JWT', () => {
            return casCookieUtils.verifyAndParse('foo', redisClient)
                .then(() => {
                    throw new Error('Should have failed');
                }).catch((err) => {
                    err.should.be.instanceOf(Error);
                });
        });

        it('should reject a valid JWT with an invalid Hawk ID', () => {
            const fakeCreds = {
                id: 'invalid',
                username:'mochatest'
            };
            const testJwt = casCookieUtils.generate(fakeCreds);
            return casCookieUtils.verifyAndParse(testJwt, redisClient)
                .then(() => {
                    throw new Error('Should have failed');
                }).catch((err) => {
                    err.should.be.instanceOf(Error);
                });
        });

    });
});
