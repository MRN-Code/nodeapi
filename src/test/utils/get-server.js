'use strict';
const cliOptsSet = require('./override-cli-opts.js');
const getServer = () => {
  const server = require('../../index.js');
  return server.app.pluginsRegistered
        .then(() => { return server; });
};

const serverReady = cliOptsSet.then(getServer);

// Export a promise that resolves to the server object when the server is ready;
module.exports = serverReady;
