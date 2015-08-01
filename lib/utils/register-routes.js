'use strict';

var glob = require('glob');
var path = require('path');

/**
 * Register a route asynchronously.
 * Allows all routes to be queued for registration before any of them are
 * actually registered
 * @param  {object} server
 * @param  {object} route   route plugin object with `register` function
 * @param  {object} options plugin registration opts used by hapi (not plugin)
 * @return {Promise}        a promise that resolves when plugin is registered
 */
function registerAsync(server, route, options) {
    return new Promise((res, rej) => {
        process.nextTick(() => {
            return server.register(route, options, (err) => {
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            });
        });
    });
}

/**
 * [registerRoutes description]
 * @param  {Object}   server is the hapi server
 * @param  {Object}   options e.g. {routesPath: 'lib/app-routes'}
 * @param  {Function} next
 * @return {[type]}           [description]
 */
function registerRoutes(server, options, next) {
    /**
     * call the `next()` function and return the input param
     * useful when chaining onto a promise
     * @param  {any} param
     * @return {any}       same as `param`
     */
    const callNext = (param) => {
        next();
        return param;
    };

    server.dependency(['hapi-redis', 'bookshelf']);

    // add route plugins
    var pluginPromises = [];

    // temporarily change process cwd to app-routes
    var originalCwd = process.cwd();
    var absPath = path.join(originalCwd, options.routesPath);
    var routesDir = path.basename(options.routesPath);
    process.chdir(absPath + '/../');

    glob.sync(routesDir + '/**/*.js').forEach((file) => {
        var newRoute;
        var options = {};
        var prefixRegex = new RegExp('^.?' + routesDir + '\/?');
        var prefix = path.dirname(file).replace(prefixRegex, '/');
        if (prefix !== '/') {
            options = { routes: { prefix: prefix } };
        }

        newRoute = {
            // TODO: this is a hack to get around the way glob manages paths
            register: require('../' + file)
        };
        pluginPromises.push(registerAsync(server, newRoute, options));
    });

    // set cwd back to what it was
    process.chdir(originalCwd);

    // call next after all routes have loaded
    Promise.all(pluginPromises)
        .then(callNext)
        .catch((err) => {
            server.log(['error', 'plugin'], err);
            next(err);
        });

    return pluginPromises;
}

module.exports.register = registerRoutes;
module.exports.register.attributes = {
    name: 'register-routes'
};
