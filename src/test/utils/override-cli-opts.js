'use strict';

const Bluebird = require('bluebird');
const path = require('path');
const cliOpts = require(path.join('../../lib/utils/cli-options.js'));
const getport = Bluebird.promisify(require('getport'));

const setOpts = (port) => {
    cliOpts['without-new-relic'] = true;
    cliOpts.coinstac = true;
    cliOpts.port = port;
    return { port: port };
};

const handleError = (err) => {
    console.log('Error retrieving unused port');
    console.log(err.stack);
};

module.exports = getport().then(setOpts).catch(handleError);
