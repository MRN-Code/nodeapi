'use strict';

const hapi = require('hapi');
const config = require('config');
const Bluebird = require('bluebird');
const _ = require('lodash');
const connectionConfig = require('./lib/utils/get-connection-options.js')();
const mcryptAuthKey = require('./lib/utils/get-mcrypt-key.js')();
const plugins = require('./lib/utils/get-plugins.js')();

// Set up Server
const server = new hapi.Server({
    connections: {
        routes: {
            cors: true
        }
    }
});

const http = server.connection(connectionConfig.http);

const registerPluginThen = (currentPromise, config) => {
    const plugin = {
        register: null,
        options:{}
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
/**
 * perform post-registration tasks.
 * This function ultimately starts the server
 * @return {null} none
 */
const handleAllPluginsRegistered = () => {
    const authUtils = require('./lib/utils/authentication.js')(server);

    http.auth.strategy(
        'default',
        'hawk',
        { getCredentialsFunc: authUtils.getHawkCredentials }
    );

    http.auth.default('default');

    // Wrap models with Shield
    require('./lib/utils/shields-up.js')(server);

    if (!module.parent) {
        server.start(() => {
            server.log(['startup'], 'server running at: ' + server.info.uri);
        });
    }
};

server.registerThen = Bluebird.promisify(server.register);

Bluebird.onPossiblyUnhandledRejection((err) => {
    server.log(['error', 'unhandled-rejection'], err);
});

// Set server-wide authKey
server.app.authKey = mcryptAuthKey;

// Redirect stderr to server logs
process.stderr.on('data', (data) => {
    server.log(['error', 'stderr'], data);
});

//register plugins
server.app.pluginsRegistered = plugins.reduce(
    registerPluginThen,
    Bluebird.resolve()
).then(handleAllPluginsRegistered)
    .catch((err) => {
        console.log(err);
        server.log('Error loading plugins');
        server.log(err);
        process.exit(1);
        throw err;

    });

module.exports = server;
