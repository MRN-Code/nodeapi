'use strict';
const chalk = require('chalk');
const cliOpts = require('./lib/utils/cli-options.js');
let newrelic;
if (!cliOpts['without-new-relic']) {
    console.log(chalk.blue('Including New Relic agent'));
    newrelic = require('newrelic');
    if (newrelic.agent) {
        console.log(chalk.blue('New Relic agent reporting enabled'));
    } else {
        console.log(chalk.blue('New Relic agent reporting disabled'));
    }
}

const hapi = require('hapi');
const Bluebird = require('bluebird');
const path = require('path');
require('./lib/utils/promise-uncaught-polyfill.js');
const _ = require('lodash');
const connectionConfig = require('./lib/utils/get-connection-options.js')();
const plugins = require('./lib/utils/get-plugins.js')();

// Set up Server
const server = new hapi.Server();

server.connection(connectionConfig.http);

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
    const getCredentialsFunc = server.plugins.utilities.auth.getHawkCredentials;

    const httpConnection = server.connections[0];

    httpConnection.auth.strategy(
        'default',
        'hawk',
        {
            getCredentialsFunc: getCredentialsFunc,
            hawk: {
                hostHeaderName: 'x-forwarded-host'
            }
        }
    );

    httpConnection.auth.default('default');

    // Wrap models with Shield
    require(path.join(__dirname, 'lib/utils/shields-up.js'))(server);

    server.start(() => {
        server.log(['startup'], 'server running at: ' + server.info.uri);
    });
};

server.registerThen = Bluebird.promisify(server.register);

Bluebird.onPossiblyUnhandledRejection((err) => {
    server.plugins.logUtil.logError(['unhandled-rejection'], err);
});

// Redirect stderr to server logs
process.stderr.on('data', (data) => {
    server.plugins.logger.logError(['stderr'], data);
});

//register plugins
server.app.pluginsRegistered = plugins.reduce(
    registerPluginThen,
    Bluebird.resolve()
).then(handleAllPluginsRegistered)
    .catch((err) => {
        console.log(err.stack);
        server.log(['error'], err.stack);
        process.exit(1);

    });

module.exports = server;
