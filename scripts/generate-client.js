'use strict';
const bluebird = require('bluebird');
const chalk = require('chalk');
const config = require('config');
const path = require('path');
const fse = bluebird.promisifyAll(require('fs-extra'));
const exec = bluebird.promisify(require('child_process').exec);

const pkgRoot = path.join(__dirname, '../');
const serverPath = path.join(pkgRoot, 'src/index.js');
const swaggerSpecPath = path.join(pkgRoot, 'dist', 'swagger.json');
const server = require(serverPath);

const codegenExecPath = path.join(
    pkgRoot,
    config.get('build.codegenPath'),
    config.get('build.codegenExecRelPath')
);

const clientDestPath = path.join(
    pkgRoot,
    config.get('build.clientDestPath')
);

const codegenTemplatePath = path.join(
    pkgRoot,
    config.get('build.codegenTemplatePath')
);

const codegenCmd = [
    'java -jar',
    codegenExecPath,
    'generate',
    '-i',
    swaggerSpecPath,
    '-l javascript',
    '-t',
    codegenTemplatePath,
    '-o',
    clientDestPath
].join(' ');

const swaggerSpecUrl = '/swagger/swagger.json';

const logInfo = (msg) => console.log(chalk.white(msg));

const logSuccess = () => console.log(chalk.green('...done'));

const getSwaggerSpec = () => {
    logInfo('Getting swagger spec from API');
    return server.injectThen(swaggerSpecUrl)
    .then((response) => {
        logSuccess();
        return response.result;
    });
};

const writeSwaggerSpec = (specObj) => {
    logInfo('Writing swagger spec to disk');
    return fse.writeJSONAsync(swaggerSpecPath, specObj)
    .then(logSuccess);
};

const generateClient = () => {
    logInfo('Generating client');
    return exec(codegenCmd).then(logSuccess);
};

const exit = () => {
    process.exit(0);
};

const handleError = (err) => {
    console.log(chalk.red('Error generating client'));
    console.log(chalk.red(err.message));
    console.dir(err.stack);
};

logInfo('Waiting for server to come online');
server.app.pluginsRegistered
    .then(logSuccess)
    .then(getSwaggerSpec)
    .then(writeSwaggerSpec)
    .then(generateClient)
    .then(exit)
    .catch(handleError);
