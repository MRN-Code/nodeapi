const _ = require('lodash');

/**
 * Register a plugin, defined by config
 * Plugins are registered sequentially, but via async methods,
 * thus return a promise.
 * @param {Promise} currentPromise promise active in the registry chain
 * @param {object} config plugin config
 * @param {Hapi} server
 * @returns {Promise}
 */
module.exports = (currentPromise, config, server) => {
    const plugin = {
        register: null,
        options: {}
    };

    const callRegisterThen = () => {
        return server.registerThen(plugin, config.registrationOptions || {});
    };

    const callAfterRegistrationCallback = () => {
        if (_.isFunction(config.afterRegistration)) {
            return config.afterRegistration(server);
        }
    };

    if (_.isFunction(config)) {
        plugin.register = config;
    } else {
        plugin.register = config.register;
    }

    if (config.options) {
        plugin.options = config.options;
    }

    return currentPromise
        .then(callRegisterThen)
        .then(callAfterRegistrationCallback);

};
