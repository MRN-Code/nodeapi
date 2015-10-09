'use strict';
require('./lib/utils/cli-options.js');
var hapi = require('hapi');
var config = require('config');
var Bluebird = require('bluebird');
require('./lib/utils/promise-uncaught-polyfill.js');
var _ = require('lodash');
var connectionConfig = require('./lib/utils/get-connection-options.js')();
var plugins = require('./lib/utils/get-plugins.js')();

// Set up Server
var server = new hapi.Server({
    connections: {
        routes: {
            cors: {
                credentials: true
            }
        }
    }
});

var http = server.connection(connectionConfig.http);

var registerPluginThen = function registerPluginThen(currentPromise, config) {
    var plugin = {
        register: null,
        options: {}
    };

    var callRegisterThen = function callRegisterThen() {
        return server.registerThen(plugin, config.registrationOptions || {});
    };

    var callAfterRegistrationCallback = function callAfterRegistrationCallback() {
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

    return currentPromise.then(callRegisterThen).then(callAfterRegistrationCallback);
};
/**
 * perform post-registration tasks.
 * This function ultimately starts the server
 * @return {null} none
 */
var handleAllPluginsRegistered = function handleAllPluginsRegistered() {
    var getCredentialsFunc = server.plugins.utilities.auth.getHawkCredentials;

    http.auth.strategy('default', 'hawk', {
        getCredentialsFunc: getCredentialsFunc,
        hawk: {
            hostHeaderName: 'x-forwarded-host'
        }
    });

    http.auth['default']('default');

    // Wrap models with Shield
    require('./lib/utils/shields-up.js')(server);

    if (!module.parent) {
        server.start(function () {
            server.log(['startup'], 'server running at: ' + server.info.uri);
        });
    }
};

server.registerThen = Bluebird.promisify(server.register);

Bluebird.onPossiblyUnhandledRejection(function (err) {
    server.log(['error', 'unhandled-rejection'], err);
});

// Redirect stderr to server logs
process.stderr.on('data', function (data) {
    server.log(['error', 'stderr'], data);
});

//register plugins
server.app.pluginsRegistered = plugins.reduce(registerPluginThen, Bluebird.resolve()).then(handleAllPluginsRegistered)['catch'](function (err) {
    console.log(err);
    server.log('Error loading plugins');
    server.log(err);
    process.exit(1);
    throw err;
});

module.exports = server;