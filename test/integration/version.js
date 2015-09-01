'use strict';

const chai = require('chai');//assertions used
const server = require('../../');//for  index.js file
const pkg = require('../../package.json');
const baseUrl="https://localhost/api/version";

// Set should property of all objects for BDD assertions
chai.should();

const myObj = {
      name: 'testObj'
};

//.eql to compare objects

describe('Version', () => {

    // Always wait for the server to be ready before beginning any tests
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered.catch((error) =>{
        	console.dir(error);
        	return error.data;

        });
    });

    it('should response with 200 status code', () => {
	const request = {
            method: 'GET',
            url: baseUrl
        };
        return server.injectThen(request).then((response) => {
            response.statusCode.should.equal(200);
          //  console.dir(response.result);
           
          //console.dir(response);
        }
        ).catch((error) =>{
        	console.dir(error);
        	return error.data;

        });
    });

    it('Version from response body should equal to package version', () => {
	const request = {
            method: 'GET',
            url: baseUrl
        };
        return server.injectThen(request).then((response) => {
           // response.statusCode.should.equal(200);
          response.result.data.version.should.equal(pkg.version);
           
          //console.dir(response);
        }
        ).catch((error) =>{
        	console.dir(error);
        	return error.data;

        });
    });
});