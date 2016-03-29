const chalk = require('chalk');

const handleError = (err) => {
    console.log(chalk.red(err.message));
    console.log(err.stack);
};

process.on('uncaughtException', handleError);
process.on('unhandledRejection', handleError);
