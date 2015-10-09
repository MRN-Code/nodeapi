'use strict';
var _ = require('lodash');
var chalk = require('chalk');
var opts = require('nomnom').option('development', {
    abbr: 'dev',
    flag: true,
    help: 'Run with process.env.COINS_ENV set to \'development\''
}).option('release', {
    abbr: 'rel',
    flag: true,
    help: 'Run with process.env.COINS_ENV set to \'release\''
}).option('production', {
    abbr: 'prd',
    flag: true,
    help: 'Run with process.env.COINS_ENV set to \'production\''
}).option('coinstac', {
    abbr: 'c',
    flag: true,
    help: 'Enable COINSTAC routes and plugins'
}).parse();

_.each(opts, function (val, opt) {
    if (_.contains(['development', 'release', 'production'], opt) && val) {
        process.env.COINS_ENV = opt;
    }
});

console.log(chalk.blue('Running with COINS_ENV: ' + process.env.COINS_ENV));

module.exports = opts;