'use strict';
const _ = require('lodash');
const chalk = require('chalk');
const opts = require('nomnom')
    .option('development', {
        abbr: 'dev',
        flag: true,
        help: 'Run with process.env.COINS_ENV set to \'development\''
    })
    .option('release', {
        abbr: 'rel',
        flag: true,
        help: 'Run with process.env.COINS_ENV set to \'release\''
    })
    .option('production', {
        abbr: 'prd',
        flag: true,
        help: 'Run with process.env.COINS_ENV set to \'production\''
    })
    .option('coinstac', {
        abbr: 'c',
        flag: true,
        help: 'Enable COINSTAC routes and plugins'
    })
    .option('without-new-relic', {
        abbr: 'w',
        flag: true,
        help: 'Do not start new relic agent'
    })
    .option('port', {
        abbr: 'p',
        default: null,
        help: 'Port to listen on'
    })
    .parse();

// handle CLI options
_.each(opts, (val, opt) => {
    if (_.contains(['development', 'release', 'production'], opt) && val) {
        process.env.COINS_ENV = opt;
    }
});

console.log(chalk.blue(`Running with COINS_ENV: ${process.env.COINS_ENV}`));

if (!opts['without-new-relic']) {
    console.log(chalk.blue('Including New Relic agent'));
    const newrelic = require('newrelic');
    if (newrelic.agent) {
        console.log(chalk.blue('New Relic agent reporting enabled'));
    } else {
        console.log(chalk.blue('New Relic agent reporting disabled'));
    }
}

module.exports = opts;
