'use strict';

require('./handle-errors');
const async = require('async');
const chalk = require('chalk');
const cp = require('child_process');
const bluebird = require('bluebird');
const path = require('path');
const pkgRoot = path.join(__dirname, '../');
const distDir = path.join(pkgRoot, 'dist');
const generateClientPath = path.resolve(__dirname, './generate-client.js');

const runTask = (task, cmd, args, cb) => {
    const spawnOpts = { cwd: pkgRoot, stdio: 'inherit' };
    const proc = cp.spawn(cmd, args, spawnOpts);
    console.log(chalk.cyan(`Running task: ${task}`));
    proc.on('close', (code) => {
        if (code !== 0) { return cb(new Error(`${task} failed. code: ${code}`)); }
        console.log(chalk.cyan(`Completed task: ${task}`));
        cb();
    });
}

async.series([
    (cb) => runTask('clean', `rm`, [`-rf`, `${distDir}`], cb),
    (cb) => runTask('init', `mkdir`, [`-p`, `${distDir}`], cb),
    (cb) => runTask('build-api-client', `node`, [`${generateClientPath}`], cb),
    (cb) => runTask('compile-browser-api-client', `webpack`, [], cb),
], (err) => {
    if (err) { throw err };
});
