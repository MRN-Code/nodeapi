'use strict';
var boom = require('boom');
var config = require('config');
var casCookieUtils = require('../../utils/cas-cookie-utils.js');

exports.register = (server, options, next) => {
    var client = server.plugins['hapi-redis'].client;
    var cookieValue = casCookieUtils.invalidate();
    server.route({
        method: 'GET',
        path: '/logout/{id}',
        config: {
            handler: (request, reply) => {
                var username = request.auth.credentials.username;
                var id = request.auth.credentials.id;
                if (id !== request.params.id) {
                    reply(boom.unauthorized('Access to this key not allowed'));
                    return;
                }

                //remove id-key upon logging out
                client.exists(id, function(err, exist) {
                    if (err) {
                        server.log(err);
                        reply(boom.wrap(err));
                        return;
                    }

                    if (!exist) {
                        reply(boom.unauthorized('Could not modify this key'));
                        return;
                    }

                    client.del(id, function(err) {
                        if (err) {
                            server.log(err);
                            reply(boom.wrap(err));
                            return;
                        }

                        client.srem(username, id, (err) => {
                            if (err) {
                                server.log(err);
                                reply(boom.wrap(err));
                                return;
                            }

                            reply('You are logged out.')
                                .code(200)
                                .state(
                                    config.get('casCookieName'),
                                    cookieValue
                                );
                        });
                    });
                });
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'logout'
};
