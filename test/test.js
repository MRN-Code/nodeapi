var should = require('should');
//var supertest = require('supertest');
var server = require('../');
var credentials;

describe('Authentication Test', function(){
    it('should greeting', function(done){
		var request = {
        	method: 'GET',
        	url: 'http://localhost/John'
      	};

      	server.inject(request, function (response) {
        	response.statusCode.should.equal(200);
        	response.result.should.equal('Hello John');
        	done();
      	});
    });

	it('should log in successfully', function (done){
		var request = {
			method: 'GET',
			url: 'http://localhost/login',
			headers: {
				Authorization: 'Basic ' + (new Buffer('john:secret')).toString('base64'),
				
			}
		};

		server.inject(request, function (response) {
console.dir(response.result);
			response.statusCode.should.equal(200);
			response.payload.should.equal();
			credentials = JSON.parse(response.payload);
			done();
		});
	});
});
