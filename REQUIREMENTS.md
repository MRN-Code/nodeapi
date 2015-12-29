The API requires various micro-services to operate.  They are as follows:

## PostgreSQL DB instance with the COINS schema
@TODO

## grunt-cli
`npm i -g grunt-cli`

## redis

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

## coins_auth

Database connection parameters are expected to be found at `/coins/coins_auth/conn/dbmap.json`.
If you do not yet have a [coins_auth](MRN-Code/coins_auth)repo (private), clone it to
`/coins/coins_auth`.  Follow all of the coins_auth install instructions before proceeding.  If you already have a coins_auth repo, be sure to pull & decrypt the latest.

## nginx

The COINS API listens for HTTP on port 8800. If you need to connect using HTTPS,
you will need to place a reverse proxy in front of the API. This is most easily
accomplished with nginx. There is an ansible role to install and configure nginx
as a reverse proxy and SSL terminator for the API. **All development servers
which are configured with Ansible should listen for HTTPS connections on port
8443.** Ask Dylan for more details.

## CouchDB/PouchDB (only if running in COINSTAC mode)
The COINSTAC services rely on a NoSQL store, which needs to persist its data somewhere.
There are various options for data persistence backends currently:


### Option 1 - CouchDB

1. Install couchdb: `sudo apt-get install couchdb`
1. Edit couchdb to listen to all IPs:
  1. Open _/etc/couchdb/default.ini_ (osx: /usr/local/etc/couchdb/default.ini)
  1. Change `bind_address` to `0.0.0.0`
  1. Change `enable_cors` to `true`
  1. Uncomment `[cors]` -> `origins = *`
1. (No longer optional) If on a localcoin, edit the nginx config, and then `sudo service nginx reload`:
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
                    "pathname": "consortiameta"
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
### Option 2 - PouchDB - leveldown adapter
This is the simplest db option, but will not work with COINSTAC client--use CouchDB instead.
It is necessary to make a path to store pouchdb data temporarily (will
    eventually use couchdb for this).
    ```
    mkdir /tmp/coinstac-pouchdb
    ```

### Option 3 - Cloudant

Not recommended.

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
                    "pathname": "consortiameta"
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
