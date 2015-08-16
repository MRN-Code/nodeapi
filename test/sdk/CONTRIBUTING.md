Contributing to the SDK
=======

Follow the steps below to add a new sub-library to the SDK.

- [ ] Create a new file in `test/sdk/` named after the routes that you will be testing.

- [ ] Copy the `client library template` below into the file.

- [ ] Add your client library logic (see existing files in `test/sdk/` for more exaples).

- [ ] require your new client library file at the bottom of `test/sdk/index.js`.

- [ ] test your client library by writing integration tests that use it (see `test/CONTRIBUTING.md`)

### client library template
```
'use strict';

const baseUri = '/auth';

let me;

// define private functions

/**
 * some function description
 * @param  {object} param1 this is an input param
 * @return {object}  this is the object returned
 */
function myPrivateFunc(param1) {
    ..do stuff
    return thing;
}

// define public functions
/**
 * initialize the internals with the config from index.js
 * @param  {object} config the config object from index.js
 * @return {null}        nothing
 */
function init(base) {
    me = base;
    return {
        exposedFunc: myPrivateFunc
    };
}

module.exports = init;

```
