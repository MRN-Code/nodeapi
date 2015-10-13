'use strict';

const Pouchy = require('pouchy');
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
    options = _.cloneDeep(_.defaults(options, defaultOptions));

    // register PouchDB plugins
    // this appears safe to do repeatedly, every time we call this function
    _.forEach(options.plugins, (plugin) => {
        Pouchy.PouchDB.plugin(plugin);
    });

    const db = new Pouchy(options);
    const pluginName = module.exports.attributes.name;
    const exposableObj = {};
    exposableObj[options.name] = db;
    exposableObj.constructor = Pouchy;

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
