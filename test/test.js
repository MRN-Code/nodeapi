'use strict';
var should = require('should');
//var supertest = require('supertest');
var server = require('../');
var credentials;

describe('Authentication Test', function() {
    it('should get public file', function(done) {
        var request = {
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
        var request = {
            method: 'GET',
            url: 'http://localhost/login',
            headers: {
                Authorization: 'Basic ' + (new Buffer('john:secret')).toString('base64')
            }
        };

        server.inject(request, function(response) {
            console.dir(response.result);
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

    it('should list all keys');
});
