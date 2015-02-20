"use strict";

var lab = require('lab').script();
var code = require('code');
var server = require('../index.js').getServer();

// Set a different port than the "default", so it doesn't break
// as often if you're running a dev server and tests together.
var PORT = process.env.PORT || 8000;
var DOMAIN = process.env.DOMAIN || 'localhost';
var HOST = DOMAIN + ':' + PORT;

var config = {
    testUserBase64: (new Buffer('john:secrtet')).toString('base64')
};

lab.experiment('write test as example', function() {
    lab.test('GET request to / returns Hello World', function (done) {
      var options = {
        method: 'GET',
        url: 'http://' + HOST + '/'
      };

      server.inject(options, function (response) {
        code.expect(response.statusCode).to.equal(200);
        code.expect(response.result).to.equal('Hello World');
        done();
      });
    });
});

lab.experiment('login system', function() {
    lab.test('GET request to /login over http fails', function (done) {
      var options = {
        method: 'GET',
        url: 'http://' + HOST + '/login'
      };

      server.inject(options, function (response) {
        code.expect(response.statusCode).to.equal(400);
        code.expect(response.result).to.equal('HTTP Protocol not supported. Use HTTPS');
        done();
      });
    });
    lab.test('GET request to /login over https without auth header fails', function (done) {
      var options = {
        method: 'GET',
        url: 'http://' + HOST + '/login'
      };

      server.inject(options, function (response) {
        code.expect(response.statusCode).to.equal(401);
        code.expect(response.result).to.equal('{"statusCode":401,"error":"Unauthorized","message":"Missing authentication"}');
        done();
      });
    });
    lab.test('GET request to /login over https with invalid auth header fails');
    lab.test('GET request to /login over https with valid auth header succeeds', function (done) {
      var options = {
        method: 'GET',
        url: 'http://' + HOST + '/login',
        headers: {
            Authorization: 'COINS ' + config.testUserBase64
        }
      };

      server.inject(options, function (response) {
        code.expect(response.statusCode).to.equal(200);
        //TODO: assert that proper credentials are provided
        code.expect(response.result).to.equal('{"statusCode":401,"error":"Unauthorized","message":"Missing authentication"}');
        done();
      });
    });
});

exports.lab = lab;
