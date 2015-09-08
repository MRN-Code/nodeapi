'use strict';

const chai = require('chai');
const server = require('../../');
const pkg = require('../../package.json');
const baseUrl = 'https://localhost/api/version';

chai.should();

const checkResponseCode = (response) => {
    response.statusCode.should.equal(200);
};

const checkPackageVersion = (response) => {
    response.result.data[0].should.have.property('version');
    response.result.data[0].version.should.equal('v' + pkg.version);
};

const printError = (error) => {
    console.dir(error);
    throw error;
};

describe('Version', () => {

    // Always wait for the server to be ready before beginning any tests
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered.catch(printError);
    });

    it('should respond with 200 status code', () => {
        const request = {
            method: 'GET',
            url: baseUrl
        };
        return server.injectThen(request)
            .then(checkResponseCode)
            .catch(printError);
    });

    it('Should give version equal to package version', () => {
        const request = {
            method: 'GET',
            url: baseUrl
        };
        return server.injectThen(request)
            .then(checkPackageVersion)
            .catch(printError);
    });
});
