'use strict';

const cp = require('child_process');
const path = require('path');
const pkgRoot = path.join(__dirname, '../');
const distDir = path.join(pkgRoot, 'dist');
const generateClientPath = path.resolve(__dirname, './generate-client.js');

const clean = () => cp.execSync(`rm -rf ${distDir} && mkdir -p ${distDir}`, { cwd: pkgRoot });
const buildClient = () => cp.execSync(`node ${generateClientPath}`, { cwd: pkgRoot });
const webpack = () => cp.execSync(`webpack`, { cwd: pkgRoot });

clean();
buildClient();
webpack();
