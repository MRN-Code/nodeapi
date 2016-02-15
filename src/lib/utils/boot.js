const cliOpts = require('./cli-options.js');
const chalk = require('chalk');

let newrelic;
if (!cliOpts['without-new-relic']) {
    console.log(chalk.blue('Including New Relic agent'));
    newrelic = require('newrelic');
    if (newrelic.agent) {
        console.log(chalk.blue('New Relic agent reporting enabled'));
    } else {
        console.log(chalk.blue('New Relic agent reporting disabled'));
    }
}
