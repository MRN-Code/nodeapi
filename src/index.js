#!/usr/bin/env node
'use strict';
require('./lib/utils/cli-options');
const connectionConfig = require('./lib/utils/get-connection-options')();
const plugins = require('./lib/utils/get-plugins')();
const registerPlugin = require('./lib/utils/register-plugin');
const setAuthenicationStrategy = require('./lib/utils/set-authentication-strategy');
const shieldsUp = require('./lib/utils/shields-up');
const bluebird = require('bluebird');
const path = require('path');
const hapi = require('hapi');

const server = new hapi.Server();
server.connection(connectionConfig.http);

// promisify server plugin registration
server.registerThen = bluebird.promisify(server.register);

// register plugins
server.app.pluginsRegistered = plugins.reduce(
    (prom, opts) => registerPlugin(prom, opts, server),
    bluebird.resolve()
)
.then(() => setAuthenicationStrategy(server))
.then(() => shieldsUp(server))
.then(() => {
    server.start(() => {
        server.log(['startup'], 'server running at: ' + server.info.uri);
    });
});

module.exports = server;
