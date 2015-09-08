'use strict';

const PouchW = require('pouchdb-wrapper');
const _ = require('lodash');
const defaultOptions = {
    namespace: 'default',
    port: 5984,
    hostname: 'localhost',
    protocol: 'http',
    db: 'my-db',
    plugins: []
};

const register = function(server, options, next) {
    options = _.merge(defaultOptions, options);

    // register PouchDB plugins
    // this appears safe to do repeatedly, every time we call this function
    _.forEach(options.plugins, (plugin) => {
        PouchW.PouchDB.plugin(plugin);
    });

    let config;
    if (options.path) {
        config = {
            path: options.path,
            name: options.name
        };
    } else if (options.conn) {
        config = {
            name: options.name,
            conn: options.conn
        };
    }

    const db = new PouchW(config);
    const pluginName = module.exports.attributes.name;
    const exposableObj = {};
    exposableObj[options.name] = db;
    exposableObj.constructor = PouchW;

    // throw error if namespace already exists
    if (
        server.plugins[pluginName] &&
        server.plugins[pluginName][options.name]
    ) {
        const msg = 'PouchDB namespace `' + options.prefix + '` already exists';
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
