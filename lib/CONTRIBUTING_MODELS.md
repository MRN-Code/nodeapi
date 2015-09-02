Contributing new models
=====

Note: this file cannot be placed in the `models/` directory because hapi-bookshelf-models will attempt to parse it.

Follow the steps below to add new models. The models will be available to you inside of routes by calling `server.plugins.bookshelf.models('ModelName');`

- [ ] Copy the `model template` below to a new file in this directory. It will be automatically registered at `server.plugins.bookshelf.models('ModelName')` when the server is restarted.

  - [ ] If it is necessary to define an `initialize` function on your new model, be sure
  to add `this.on('save', this._utils.saveHist, this)` so that history saving is preserved.

  - [ ] Avoid re-defining `parse` and `format` on your models. These methods are
  used to convert between snake_case and camelCase.

- [ ] Add `read_<MyModel>`, `create_`, `update_`, and `delete_` verbs to 'lib/permissions/permissions-schema.json' in order to allow different roles to access your model. See `lib/permissions/README.md`

- [ ] Add one or more shieldConfig objects to `config/default.json` that correspond to your model.  Note that most access is governed through the *study* `aclContext`.


Note also that all models are bookshelf models, and that they are wrapped with Bookshel-shield for authorization. See the bookshelf-shield documentation for more information about accessing data.

### model template

```
'use strict';

module.exports = function(bookshelf) {
    return bookshelf.extend({
        tableName: '<table_name>'
    });
};

```
