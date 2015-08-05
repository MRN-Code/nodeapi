# nodeapi
node based API for COINS

# Requirements

If you miss any of these requirements, remove all node modules and reinstall them
after installing the requirements.

### io.js
In order to support ES2015 Specifications, it is best to run this application
with io.js. If you don't have io.js installed, we recommend using the `n`
package to manage your node versions:

```
npm i -g n
```

Then install io.js

```
n io latest
```

### mcrypt
This package uses the [mcrypt](https://github.com/tugrul/node-mcrypt) package,
which relies on some system-level dependencies.

On Linux:
```
apt-get install libmcrypt4 libmcrypt-dev
```

On Mac:
```
brew install mcrypt
```

### redis
Authentication credentials and ACL permissions are stored in
a redis datastore. You need to have redis installed and running
before starting the server.

On Linux (Ubuntu):
```
apt-get install redis-server;
redis-server &
```

On Mac:
```
brew install redis
redis-server /usr/local/etc/redis.conf &
```

### coins_auth
Database connection parameters are expected to be found at `/coins/coins_auth/conn/dbmap.json`.
Be sure to clone our coins_auth repo (private) to `/coins/coins_auth`.
In addition, checkout the **nodeapi** branch of *coins_auth*, grab a copy of
`coinscredentials.json` from another server, and run **grunt decrypt** in coins_auth/.

# Design Specifications
## Response format
All responses are a JSON string which parses to an object of the following format:
```js
{
  data: [ ... ],
  error: null | {},
  stats: {will eventually include performance data}
}
```
It is worth noting that the data property will always be an array, even if only a single value is requested/retrieved.

The error property will be null if no errors have occurred.
If an error did occur, then the error object will take the following form:
```js
{
  error: '...',
  message: '...',
  statusCode: ###,
  debugData: {custom debug data}
}
```

## Endpoints

Please refer to the swagger documentation that is auto-generated by this repo.
To view it, start this server `npm start`, and navigate to the base url +
`/documentation` (e.g. https://api.coins.mrn.org/documentation).
