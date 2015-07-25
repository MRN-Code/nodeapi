'use strict';

var glob = require('glob');

var registerRoutes = function(server, options, next) {
    // add route plugins
    var plugins = [];
    var newRoute;
    glob.sync('lib/app_routes/*.js').forEach(function(file) {
        newRoute = {
            // TODO: this is a hack to get around the way glob manages paths
            register: require('../../' + file)
        };
        plugins.push(newRoute);
    });

    server.register(plugins, function(err) {
        if (err) {
            server.log(err.toString());
            next(err);
            throw err;
        }

        next();
    });

    return plugins;
};

module.exports.register = registerRoutes;
module.exports.register.attributes = {
    name: 'register-routes'
};
