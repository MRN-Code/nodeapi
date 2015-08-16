COINS API Javascript client
========

# Peer Dependencies

### request
In order to keep the use of this client as flexible as possible, the client
needs to be initialized with a function that can be used to make XHR requests.
The client was designed to work with the [request](https://www.npmjs.com/package/request)
package, but it can be adapted to work with others (like browser-request, or xhr).

### PouchDB
Again, in the interest of portability, the client relies on PouchDB to store
information persistently. In the browser, you will want to supply a PouchDB
instance that persists data to *localstorage* or *indexeddb*. For testing purposes,
an in-memory PouchDB will also work fine.

# Configuration

### Basic configuration:
```
const request = require('request');
const Promise = require('bluebird');
const apiClientOptions = {
    requestFn: Promise.promisify(request),
    baseUrl: 'http://localhost:3000',
    pouchClient: new PouchDB('/tmp/pouchdb-coins-api-test')
};j
const client = require('../sdk/index.js')(apiClientOptions);
```
The above configuration parameters are *required*.
**Note that the 'requestFn' must be promisified**

### Advanced configuration:

This client can use multiple request engines to make requests to the API. This
allows the COINS team to use the client for its integration tests as well as
for its browser application. Most of the configuration is centered around mapping
the parameters that the client will feed to the request engine. If you are using
*request* as your request engine, then there is no configuration needed. See
`nodeapi/test/utils/init-api-client` for an example of how to configure the
client to use *hapi server.injectThen*.

# Usage

Once you have a configured client, you can use the following methods to interact
with the COINS API:

### *{Promise}* = .auth.login(username, password)

Sends POST request to /auth/keys, and stores resulting credentials in pouchdb.

### *{Promise}* = .auth.logout(username, password)

Sends DELETE request to /auth/keys, and removes credentials from pouchdb.

### *{Promise}* = .getAuthCredentials()

Get the credentials currently stored in pouchdb.

### *{Promise}* = .setAuthCredentials(val)

Set the credentials stored in pouchdb: will overwrite if already set.

### *{Promise}* = .makeRequest(options, sign)

Takes a set of request options formatted for the *request* library, and
modifies the options according to the requestObjectMap before signing the
request (*if `sign !== false`*) and sending it.

# Examples

See `nodeapi/test/integration/keys.js`
