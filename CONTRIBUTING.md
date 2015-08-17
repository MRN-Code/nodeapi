COINS API Contribution Guidelines
=========

# Workflow
As of v1.0.0, all changes will follow the standard COINS gitflow model: Here are the basics:

1. Create a new branch from the `develop` branch of this repo.
1. Add your tests, features, fixes and documentation.
1. Run `npm test` to verify that all tests pass.
1. Create a Pull Request on Github.com to merge your branch with the `develop` branch.
1. Assign a code review task to one of your co-workers on Asana.

For more info see: https://docs.google.com/document/d/1wbiw0hbk1pluzFyWas-yfXQkNFhXT5M1edlnJNdP2vU/edit

# Linting

Please use the provided .jscsrc and .jshintrc to lint all files. This can be most easily accomplished by running `grunt lint`. We also *strongly* suggest that you incorporate these linting agents into your text-editor for efficiency's sake.

**No linting errors will be tollerated**

# Testing

Testing should cover all critical components of the API. The `test/` directory includes a sub-directory for unit tests and a sub-directory for integration tests. Most features added to this project will need both types of tests.

See the `CONTRIBUTING.md` file in the `test/` directory for more info about tests.

# Adding Routes

Here is a simple checklist for adding new routes. It explains where new code must be added for the route to function properly, and for tests and documentation requirements to be met.

- [ ] **Tests** : where possible, begin by writing tests that fail (because the new feature or fix is not yet implemented).
  - [ ] **Unit tests** are added to `test/unit`
  - [ ] **Integration tests** are added to `test/integration`.
  - [ ] A **Client SDK** is used to run integration tests of each route. The clients are added to `test/sdk`.  See `test/sdk/CONTRIBUTING.md`

  See `test/CONTRIBUTING.md`.

- [ ] **Models**: Your new route may need to access tables that have not yet been added to our bookshelf models.
    - [ ] **New models** are added in `lib/models`.
    - [ ] **Access verbs** for those models are added to `lib/permissions/permission-schema.json`
    - [ ] **shieldConfig** objects must be added to `config/default.json`

Note that the models are accessed through `bookshelf-shield`, which exposes `create`, `read`, `readAll`, `update`, and `delete` methods instead of the standard bookeshelf `save`, `fetch`, `fetchAll`, `remove`. **See `lib/CONTRIBUTING_MODELS.md`**.

- [ ] **Routes**: Routes are defined in `lib/app-routes`. To add a completely new route, simply add a new file that exports a hapi plugin registration object. **See `lib/app-routes/CONTRIBUTING.md`**.

# Adding other functionality

### plugins
Plugins should be registered with the server by adding them to `lib/utils/get-plugins.js`.

If you are writing your own plugin, and do not wish to install it via NPM, put the plugin in `lib/utils`.

### Controllers
As route handlers get more complex, it makes sense to move the logic into a separate controller. These controllers should be unit tested.
