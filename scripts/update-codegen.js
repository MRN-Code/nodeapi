'use strict';

const chalk = require('chalk');
const config = require('config');
const execSync = require('child_process').execSync;
const fse = require('fs-extra');
const path = require('path');

const codegenSrcPath = path.join(
    process.cwd(),
    config.get('build.codegenSrcPath')
);
const codegenSrcExecPath = path.join(
    codegenSrcPath,
    config.get('build.codegenSrcExecRelPath')
);
const codegenDestPath = path.join(
    process.cwd(),
    config.get('build.codegenPath')
);
const codegenDestExecPath = path.join(
    codegenDestPath,
    config.get('build.codegenExecRelPath')
);
const swaggerRepoUrl = config.get('build.codegenRepoUrl');

// Helper functions
const logSuccess = () => {
    console.log(chalk.green('...done'));
};

// Let's begin!

// clean the src directory for swagger-codegen
console.log(chalk.white(`emptying dir: ${codegenSrcPath}`));
fse.emptyDirSync(codegenSrcPath);
logSuccess();

// clone the swagger-codegen repository
console.log(chalk.white(`cloning repo: ${swaggerRepoUrl}`));
execSync(`git clone ${swaggerRepoUrl} ${codegenSrcPath} --depth=1`);
logSuccess();

// build the swagger-codegen src codegen
console.log(chalk.white('building swagger-codegen src'));
execSync('mvn package', { cwd: codegenSrcPath });
logSuccess();

// clean the dest directory
console.log(chalk.white(`emptying dir: ${codegenDestPath}`));
fse.emptyDirSync(codegenDestPath);
logSuccess();

// copy the built files from src to version-controlled dir
console.log(chalk.white(`cping ${codegenSrcExecPath}->${codegenDestExecPath}`));
fse.copySync(codegenSrcExecPath, codegenDestExecPath);
logSuccess();
