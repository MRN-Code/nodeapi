'use strict';
const _ = require('lodash');
const chalk = require('chalk');
const opts = require("nomnom")
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
    .parse();

_.each(opts, (val, opt) => {
    if (_.contains(['development', 'release', 'production'], opt) && val) {
        console.log(chalk.blue(`Running with COINS_ENV: ${opt}`));
        process.env.COINS_ENV = opt;
    }
});

module.exports = opts;