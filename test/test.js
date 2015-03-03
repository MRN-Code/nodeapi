'use strict';
var hawk = require('hawk');
var should = require('should');
//var supertest = require('supertest');
var server = require('../');
var redisClient = require('redis').createClient();
var credentials;
var request;

var testCredential = {
    id: '5892c80a-25b3-4000-a052-304b813da477',
    key: '889ace2f-585d-418f-a95d-63fc36e577e8',
    algorithm: 'sha256'
};

var generateHawkHeader = function(url, method) {
    return hawk.client.header(url, method, { credentials: credentials });
};

describe('Authentication Test', function() {
    it('should get public file', function(done) {
        request = {
            method: 'GET',
            url: 'https://localhost/index.html'
        };

        server.inject(request, function(response) {
            response.statusCode.should.equal(200);
            response.payload.should.equal('Hello World\n');
            done();
        });
    });

    it('should log in successfully', function(done) {
        request = {
            method: 'GET',
            url: 'http://localhost/login',
            headers: {
                Authorization: 'Basic ' + (new Buffer('john:secret')).toString('base64')
            }
        };

        server.inject(request, function(response) {
            //console.dir(response.result);
            response.statusCode.should.equal(200);
            credentials = JSON.parse(response.payload);
            credentials.should.be.an.instanceOf(Object);
            credentials.should.have.property('id');
            credentials.should.have.property('key');
            credentials.should.have.property('algorithm');
            credentials.should.have.property('issueTime');
            credentials.should.have.property('expireTime');
            done();
        });
    });

    it('should list all keys', function(done) {
        var url = 'http://localhost/profile/keys';
        var header = generateHawkHeader(url, 'GET');
        request = {
            method: 'GET',
            url: url,
            headers: {
                authorization: header.field
            }
        };

        server.inject(request, function(response) {
            JSON.parse(response.payload).should.be.an.instanceOf(Array);
            done();
        });
    });

    it('should list a key or null', function(done) {
        var id = testCredential.id + 'asd';
        var url = 'http://localhost/profile/key/' + id;
        var header = generateHawkHeader(url, 'GET');
        request = {
            method: 'GET',
            url: url,
            headers: {
                authorization: header.field
            }
        };
        redisClient.exists(id, function(err, valid) {
            server.inject(request, function(response) {
                if (valid) {
                    response.payload.should.be.an.instanceOf(String);
                } else {
                    response.payload.should.be.equal('Invalid id provided');
                }
                done();
            });
        });
    });

    it('should log out', function(done) {
        var url = 'http://localhost/logout';
        var header = generateHawkHeader(url, 'GET');
        request = {
            method: 'GET',
            url: url,
            headers: {
                authorization: header.field
            }
        };
        server.inject(request, function(response) {
//console.log(response);
            response.statusCode.should.equal(200);
            response.payload.should.equal('You are logged out.');
            done();
        });
    });
});
