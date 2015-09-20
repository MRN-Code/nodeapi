# nodeapi
node based API for COINS

# Requirements

If things aren't working, go down this quick checklist.

- [ ] Are you running io.js v2.5? Does not work with v3+ or Node.js

- [ ] Did you install the mcrypt system package (not the npm package)?

- [ ] Is a redis server installed and running locally?

- [ ] Have you pulled the latest changes in coins_auth, and run `grunt build`?

- [ ] Is nginx installed, configured and running locally?

- [ ] (only if running in COINSTAC mode) Did you create a cloudant account, or `mkdir /tmp/coinstac-pouchdb`?

If you miss any of these requirements, remove all node modules and reinstall them
after installing the requirements.


### io.js v2.5
In order to support ES2015 Specifications, it is best to run this application
with io.js. If you don't have io.js installed, we recommend using the `n`
package to manage your node versions:

```
npm i -g n
```

Then install io.js

```
n io 2.5
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
If you do not yet have a coins_auth repo, clone our coins_auth repo (private) to
`/coins/coins_auth`. Next, grab a copy of `coinscredentials.json` from another
server and put it in _coins_auth_.
If you already have a coins_auth repo, be sure to run `git pull`
Finally, run **grunt decrypt** in coins_auth/ to decrypt the latest dbmap.

### nginx
The COINS API listens for HTTP on port 8800. If you need to connect using HTTPS,
you will need to place a reverse proxy in front of the API. This is most easily
accomplished with nginx. There is an ansible role to install and configure nginx
as a reverse proxy and SSL terminator for the API. **All development servers
which are configured with Ansible should listen for HTTPS connections on port
8443.** Ask Dylan for more details.

### *ouchDB (only if running in COINSTAC mode)
The COINSTAC services rely on PouchDB, which needs to persist its data somewhere.
There are two options for Pouch persisence backends currently:

#### PouchDB Leveldown (simplest, but will not work with COINSTAC client)
It is necessary to make a path to store pouchdb data temporarily (will
eventually use couchdb for this).
```
mkdir /tmp/coinstac-pouchdb
```

#### CouchDB

1. Install couchdb: `sudo apt-get install couchdb`
1. Edit couchdb to listen to all IPs:
  1. Open _/etc/couchdb/default.ini_ (osx: /usr/local/etc/couchdb/default.ini)
  1. Change `bind_address` to `0.0.0.0`
  1. Change `enable_cors` to `true`
  1. Uncomment `[cors]` -> `origins = *`
1. If on a localcoin, add port forwarding for port 5984 to _/coins/localcoin/Vagrantfile_, **and reload the vagrant VM**
1. (optional) If you wish to connect to your couchdb via https, edit the nginx config, and then `sudo service nginx reload`:
  1. Open _/etc/nginx/sites-enabled/default_
  1. Add the following below the `api location` block:
  ```
  location /couchdb {
    rewrite /couchdb(.*) /$1 break;
    proxy_set_header        X-Forwarded-Host $host;
    proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache             off;
    proxy_pass              http://localhost:5984;
    proxy_redirect          off;
  }
  ```
1. Create a _config/local.json_ file with the following content:
```
{
    "coinstac": {
        "pouchdb": {
            "consortiaMeta": {
                "conn": {
                    "hostname": "localhost",
                    "protocol": "http",
                    "port": 5984,
                    "pathname": "consortiaMeta"
                }
            },
            "consortia": {
                "conn": {
                    "hostname": "localhost",
                    "protocol": "http",
                    "port": 5984
                }
            }
        }
    }
}
```

#### Cloudant

1. Sign up for a Cloudant account (Cloudant.com)
1. Once logged in, click on `Account->CORS->Enable CORS`, and select **All origin domains**
1. Create a _config/local.json_ file with the following content:
```
{
    "coinstac": {
        "pouchdb": {
            "cloudant": {
                "key": "${base64 encode username:password}",
                "hostname": "${USERNAME}.cloudant.com"
            },
            "consortiaMeta": {
                "conn": {
                    "hostname": "${USERNAME}.cloudant.com",
                    "protocol": "https",
                    "pathname": "consortiaMeta"
                },
                "pouchConfig": {
                    "ajax": {
                        "headers": {
                            "Authorization": "${base64 encode username:password}"
                        }
                    }
                }
            },
            "consortia": {
                "conn": {
                    "hostname": "${USERNAME}.cloudant.com",
                    "protocol": "https"
                },
                "pouchConfig": {
                    "ajax": {
                        "headers": {
                            "Authorization": "${base64 encode username:password}"
                        }
                    }
                }
            }
        }
    }
}
```
# Usage

## Starting the server
The simplest way to start the server is to use the `npm start` command.
If that fails, look at `package.json` for the command that `npm start` runs,
and run that manually for a more useful output.

If you wish to pass CLI options to the startup process, you will need to start
the server using the full command (see _package.json_ for the command which is
run by `npm start`).

To start the server as a Daemon, all Ansible-provisioned servers should have an
upstart script: `sudo start coinsnodeapi`.

To start the server with auto-restart, try using monit: `monit [re]start coinsnodeapi`.

Unfortunately, **pm2** does not play well with our monitoring strategy, so we
do not recommend using pm2 to run the API as a daemon. 

## CLI options
Use `node index --help` to see all available options.

- @flag development/release/production run the server using COINS_ENV of the respective flag. Shorthand --dev/rel/prd are honored.

- @flag coinstac start the server with COINSTAC routes. Defaults to false.

Logs are written to the `logs/` directory in this repo.

# Design Specifications

## Code
Please refer to `CONTRIBUTING.md` for details about the code structure, and how
to add to it.

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

### base URL
All endpoints have a prefix of `/api/v#.#.#` where `v#.#.#` is the version in
`package.json`.
The one exception to the above rule is `GET /api/version`, which can be used to
retrieve the version via the API itself.

### protocol
By default, this server starts accepting `HTTP` connections on port 8080.
To use HTTPS, place a reverse proxy server in front of this service. production
and staging environments should listen for HTTPS connections on port 443, while
development systems should listen on port 8443.

### other endpoints
Please refer to the swagger documentation that is auto-generated by this repo.
To view it, start this server `npm start`, and navigate to the base url +
`/documentation` (e.g. https://coins-api.mrn.org/api/v<version>/documentation).
