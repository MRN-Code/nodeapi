Contributing tests
=====

Before getting into the steps for writing tests, here's some background info:

# Test types:
The COINS API uses two types of tests. Code coverage emphasis will be placed on integration tests, but unit tests can be very useful when debugging.

### Unit:
Unit tests should be used wherever there is a modular function exposed. For instance, `lib/utils/cas-cookie-utils` exports some functions for manipulating JSON web token cookies. These functions are easily unit tested to ensure that they provide predictable outputs and throw expected errors.

### Integration:
Integration tests should be used to test two or more components interacting together. All routes should be integration tested to ensure that they reply with the expected error codes and data for all edge cases. Integration tests require a functioning redis database and a connection to a COINS PostgreSQL database.

# Test utilities and stubs
### stubs
Stubs should be used to mock the behavior of a library or program to enable more simplified unit testing. The fakeredis npm package is an example of a stub, which is used to simulate a redis client. Despite the roaring internet discussions about stubs vs. mocks, we'll just call them al stubs here ;-)

### utilities
Functions that are likely to be reused across many tests should be broken out into a separate file in `test/utils`.

# Writing unit tests
These are simple, since there are not many dependencies. See existing unit tests for examples.

# Writing integration tests

Follow the steps below to write a new integration test.

- [ ] Write an API client library for your routes. **See `test/sdk/CONTRIBUTING.md`**

- [ ] Create a new file in test/integration/<route_name>.js, and paste the `integration test template` into it

- [ ] Add your test logic.
  - [ ] To quickly add a bunch of pending test that you plan to implement later, simply call `it()` with just a string: e.g. `it('this test needs to be implemented');` These can function well as place-holders for tests that you don't have the confidence to implement right now.

- [ ] Run test using `npm test`, `grunt test`, or `mocha test/integration/mytest.js`

### integration test template
```
'use strict';

const chai = require('chai');
const server = require('../../');
const initApiClient = require('../utils/init-api-client.js');
let apiClient;
let credentials;

/**
 * set the apiClient variable inside the parent closure
 * @param  {object} client an initialized API Client
 * @return {object}        the same API Client
 */
const setApiClient = function(client) {
    apiClient = client;
    return client;
};

// Set should property of all objects for BDD assertions
chai.should();

describe('Replace this with what your test describes', () => {

    // Always wait for the server to be ready before beginning any tests
    before('wait for server to be ready', () => {
        return server.app.pluginsRegistered
            .then(initApiClient)
            .then(setApiClient);
    });

    it('does what we expect', () => {
        apiClient.auth.login('mochatest', 'mocha')
            .then(apClient.myLib.get)
            .then(assert stuff);
    });
});

```
