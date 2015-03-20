'use strict';

exports.register = function (server, options, next) {
    // Public route: no authorization required
    // This is where the client will be served from
    server.route({
        method: 'GET',
        path: '/{path*}',
        config: {
            auth: false,
            handler: {
                directory: {
                    path: 'public',
                    index: true,
                    defaultExtension: 'html'
                }
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'publicRoute'
};
