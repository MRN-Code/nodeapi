'use strict';

var Pouchy = require('pouchy');
var _ = require('lodash');
var defaultOptions = {
    name: 'default',
    plugins: [],
    conn: {
        port: 5984,
        hostname: 'localhost',
        protocol: 'http'
    }
};

var register = function register(server, options, next) {
    options = _.cloneDeep(_.defaults(options, defaultOptions));

    // register PouchDB plugins
    // this appears safe to do repeatedly, every time we call this function
    _.forEach(options.plugins, function (plugin) {
        Pouchy.PouchDB.plugin(plugin);
    });

    var db = new Pouchy(options);
    var pluginName = module.exports.attributes.name;
    var exposableObj = {};
    exposableObj[options.name] = db;
    exposableObj.constructor = Pouchy;

    // throw error if name already exists
    if (server.plugins[pluginName] && server.plugins[pluginName][options.name]) {
        var msg = 'PouchDB namespace `' + options.name + '` already exists';
        next(new Error(msg));
    }

    // attempt to get info from the db
    return db.info().then(function () {
        server.expose(exposableObj);
        next();
    })['catch'](next);
};

module.exports = register;
module.exports.attributes = {
    name: 'houchdb',
    version: '1.0.0',
    multiple: true
};