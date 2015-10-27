'use strict';

const path = require('path');
const cliOpts = require(path.join('../../lib/utils/cli-options.js'));

cliOpts['without-new-relic'] = true;
cliOpts.coinstac = true;
