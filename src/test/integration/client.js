'use strict';

const chai = require('chai');
const serverReady = require('../utils/get-server.js');
const path = require('path');
const fs = require('fs');
const baseUrl = 'https://localhost/api/client/client.js';

chai.should();

let server;

const checkResponseCode = (response) => {
  response.statusCode.should.equal(200);
};

const checkResponseContent = (response) => {
  const clientSource = fs.readFileSync(
        path.join(__dirname, '../../../dist/client/dist/client.js'),
        'utf8'
    );
  response.result.should.eql(clientSource);
};

const printError = (error) => {
  console.dir(error);
  throw error;
};

const setServer = (hapiServer) => {
  server = hapiServer;
};

describe('Client Souce Code', () => {

    // Always wait for the server to be ready before beginning any tests
  before('wait for server to be ready', () => {
    return serverReady
            .then(setServer)
            .catch(printError);
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
            .then(checkResponseContent)
            .catch(printError);
  });
});
