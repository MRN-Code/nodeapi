'use strict';

const PouchW = require('pouchdb-wrapper');
const _ = require('lodash');
const defaultOptions = {
    name: 'default',
    plugins: [],
    conn: {
        port: 5984,
        hostname: 'localhost',
        protocol: 'http'
    }
};

const register = function(server, options, next) {
    options = _.defaults(options, defaultOptions);

    // register PouchDB plugins
    // this appears safe to do repeatedly, every time we call this function
    _.forEach(options.plugins, (plugin) => {
        PouchW.PouchDB.plugin(plugin);
    });

    const db = new PouchW(options);
    const pluginName = module.exports.attributes.name;
    const exposableObj = {};
    exposableObj[options.name] = db;
    exposableObj.constructor = PouchW;

    // throw error if name already exists
    if (
        server.plugins[pluginName] &&
        server.plugins[pluginName][options.name]
    ) {
        const msg = 'PouchDB namespace `' + options.name + '` already exists';
        next(new Error(msg));
    }

    // attempt to get info from the db
    return db.info()
        .then(() => {
            server.expose(exposableObj);
            next();
        }).catch(next);
};

module.exports = register;
module.exports.attributes = {
    name: 'houchdb',
    version: '1.0.0',
    multiple: true
};
