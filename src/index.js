'use strict';
const boot = require('./lib/utils/boot.js');
const connectionConfig = require('./lib/utils/get-connection-options.js')();
const plugins = require('./lib/utils/get-plugins.js')();
const registerPlugin = require('./lib/utils/register-plugin.js');
const setAuthenicationStrategy = require('./lib/utils/set-authentication-strategy');
const shieldsUp = require('./lib/utils/shields-up.js');
const Bluebird = require('bluebird');
const path = require('path');
const hapi = require('hapi');

const server = new hapi.Server();
server.connection(connectionConfig.http);

// promisify server plugin registration
server.registerThen = Bluebird.promisify(server.register);

// register plugins
server.app.pluginsRegistered = plugins.reduce(
    (prom, opts) => registerPlugin(prom, opts, server),
    Bluebird.resolve()
)
.then(() => setAuthenicationStrategy(server))
.then(() => shieldsUp(server))
.then(() => {
    server.start(() => {
        server.log(['startup'], 'server running at: ' + server.info.uri);
    });
});

module.exports = server;
