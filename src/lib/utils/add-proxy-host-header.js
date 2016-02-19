'use strict';

/**
 * sniffs for x-forwarded-host header.  if head found missing, fills it with
 * host header. this app, in practice, exists behind a reverse proxy, and
 * checks for the x-forwarded-host header to validate client mac addresses
 * against.
 */
module.exports.register = function(server, options, next) {
    server.ext('onPreAuth', (request, reply) => {
        if (!request.headers['x-forwarded-host']) {
            request.headers['x-forwarded-host'] = request.headers.host;
        }

        reply.continue();
    });
    next();
};

module.exports.register.attributes = {
    name: 'add-proxy-host-header'
};
