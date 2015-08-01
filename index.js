'use strict';

const hapi = require('hapi');
const config = require('config');
const Promise = require('bluebird');
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

server.registerThen = Promise.promisify(server.register);
var https = server.connection(connectionConfig.https);
var http = server.connection(connectionConfig.http);

Promise.onPossiblyUnhandledRejection((err) => {
    server.log(['error', 'unhandled-rejection'], err);
});

// Set server-wide authKey
server.app.authKey = mcryptAuthKey;

// Redirect stderr to server logs
process.stderr.on('data', function(data) {
    server.log(data);
});

//register plugins
server.app.pluginsRegistered = plugins.reduce((cur, config) => {
    const plugin = {
        register: null,
        options:{}
    };

    if (_.isFunction(config)) {
        plugin.register = config;
    } else {
        plugin.register = config.register;
    }

    if (config.options) {
        plugin.options = config.options;
    }

    return cur.then(() => {
        return server.registerThen(plugin, config.registrationOptions || {});
    })
        .then(() => {
            if (_.isFunction(config.afterRegistration)) {
                return config.afterRegistration(server);
            }

            return;
        });

}, Promise.resolve())
    .then(() => {
        var authUtils = require('./lib/utils/authentication.js')(server);

        https.auth.strategy(
            'default',
            'hawk',
            { getCredentialsFunc: authUtils.getHawkCredentials }
        );

        https.auth.default('default');

        // Mock relations plugin
        // TODO: replace with actual plugin
        server.plugins.relations = require('relations');
        var relationsSchema = require(config.get('permissionsSchemaPath'));
        var loadSchema = require('./lib/permissions/load-schema.js');
        loadSchema(server.plugins.relations, relationsSchema);

        // Wrap models with Shield
        require('./lib/utils/shields-up.js');

        http.route({
            method: '*',
            path: '/{path*}',
            handler: function(request, reply) {
                var url = require('url');
                var newUrl = url.format({
                    protocol: 'https',
                    hostname: request.info.hostname,
                    port: config.get('httpsPort'),
                    pathname: request.url.path,
                    query: request.query
                });

                //reply('Please use https instead of http.');
                reply.redirect(newUrl);
            }
        });

        if (!module.parent) {
            server.start(function() {
                console.log('server running at: ' + server.info.uri);
            });
        }
    })
    .catch((err) => {
        console.log(err);
        server.log('Error loading plugins');
        server.log(err);
        process.exit(1);
        throw err;

    });

module.exports = server;
