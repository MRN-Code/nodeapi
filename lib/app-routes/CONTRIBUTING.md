Contributing new routes
======
Follow these guidelines to create new routes.

- [ ] Create a new file in `lib/app-routes` with the content of the `plugin template` below. All js files in `lib/app-routes` are automatically registered to the server at startup.

- [ ] If creating multiple routes that should exist one-level deep (e.g. `/auth/keys` and `/auth/cookies`), the new file may be placed in a sub-directory. See the `auth` routes for an example.

## Using models
Models placed in `lib/models` will be available by accessing
`[request.]server.plugins.bookshelf.model('modelName')`.

These models are all extended from a *base* model found in `lib/utils/get-base-model.js`.
The base model adds a `parse` method to automatically convert *snake_case* column
names to *camelCase* on any model that is fetched. Similarly, the base model
adds a `format` method to convert *camelCase* property names to *snake_case*
whenever a model is saved. **Consequently, use camelCase to reference
column names, except when building queries**. 


## plugin template

```
'use strict';

// require 3rd party packages
//TODO: remove any unused packages
const boom = require('boom');
const _ = require('lodash');
const joi = require('joi');

// require 1st party packages
const foo = require(''./lib/foo.js');

// define variables
const myConstant = 1;

//export plugin registration function
exports.register = (server, options, next) =>  {
    /* example:
    server.route({
        path: '/example/{id}',
        method: '/* Possible values: GET, PUT, POST, DELETE */',
        config: {
            tags: ['api', /*[add other tags here]*/],
            notes: [
                'Use this syntax to',
                'Join multiple short strings together'
            ].join('<br>'),
            description: 'Describe the route here',
            auth: true,
            validate: {
                params: { /*path param validation*/ },
                query: { /*query param validation*/ },
                payload: { /*payload (body) validation*/ }
            },
            handler: (request, reply) => {
                doSomethingAsync
                    .then(reply)
                    .catch((err) => {
                        request.log(['error', 'example'], err.message);
                        reply(boom.wrap(err));
                    });
            }
        }
    });
    next();
};

exports.register.attributes = {
    //TODO: update name
    name: 'example route'
};

```
