Contributing to the SDK
=======

The SDK utilizes [UMD wrappers](https://github.com/umdjs/umd) so that it works in AMD, CommonJS and browser environments. Refer to the [return exports template](https://github.com/umdjs/umd/blob/master/returnExports.js) for notes on use.

Follow these steps to add a new sub-library to the SDK:

- [ ] Create a new file in `test/sdk/` named after the routes that you will be testing.

- [ ] Copy the `client library template` below into the file.

- [ ] Add your client library logic (see existing files in `test/sdk/` for more exaples).

- [ ] Inject your new client library into the entry point’s `factory`.

- [ ] test your client library by writing integration tests that use it (see `test/CONTRIBUTING.md`)

### client library template

```js
/* jshint strict:false */
/* global define */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['my-required-package'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('my-required-package'));
    } else {
        // Browser globals (root is window)
        root.CoinsApiClient = root.CoinsApiClient || {};
        root.CoinsApiClient.MyNewClientLib = factory(
            root.CoinsLogonApiClient.MyRequiredPackage
        );
    }
}(this, function(MyRequiredPackage) {

    function MyNewClientLib() {

    }

    // Your script's content...

    return MyNewClientLib;
}));
```
