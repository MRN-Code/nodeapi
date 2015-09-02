'use strict';

const chai = require('chai');
const server = require('../../');//
const pkg = require('../../package.json');
const baseUrl="https://localhost/api/version";

chai.should();

const myObj = {
      name: 'testObj'
};

describe('Version', () => {

    // Always wait for the server to be ready before beginning any tests
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered.catch((error) =>{
        	console.dir(error);
        	throw error;

        });
    });

    it('should respond with 200 status code', () => {
	const request = {
            method: 'GET',
            url: baseUrl
        };
        return server.injectThen(request).then((response) => {
            
            response.statusCode.should.equal(200);
         
        }
        ).catch((error) =>{
        	console.dir(error);
        	throw error;

        });
    });

    it('Should respond with a version number equal to the package version', () => {
	const request = {
            method: 'GET',
            url: baseUrl
        };
        return server.injectThen(request).then((response) => {
          response.result.data.should.have.property('version');
          response.result.data.version.should.equal(pkg.version);
          
        }
        ).catch((error) =>{
        	console.dir(error);
        	throw error;

        });
    });
});