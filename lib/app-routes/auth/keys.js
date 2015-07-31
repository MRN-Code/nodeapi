'use strict';

const boom = require('boom');
const config = require('config');
const casCookieUtils = require('../../utils/cas-cookie-utils.js');
const joi = require('joi');

const baseUrl = '/keys';

exports.register = function(server, options, next) {
    // Private route to get new hawk credentials
    // Requests must authenticate with a username and password
    const redisClient =  server.plugins['hapi-redis'].client;
    const authUtils = require('../../utils/authentication.js')(server);
    const invalidCookie = casCookieUtils.invalidate();

    server.state(config.get('casCookieName'), {
        path: '/',
        domain: config.get('cookieDomain')
    });

    server.route({
        method: 'POST',
        path: baseUrl,
        config: {
            tags: ['api', 'auth'],
            notes: [
                'Expects base64 encoded username/password in payload.',
                'Response includes a `set-cookie` header with JWT for COINS2.0'
            ].join('<br>'),
            description: 'Login: Get new API key and JWT cookie',
            auth: false,
            validate: {
                headers: true, //TODO: validate x-forwaded https header
                payload: {
                    username: joi.binary().encoding('base64').required(),
                    password: joi.binary().encoding('base64').required()
                }
            },
            handler: function(request, reply) {
                const data = request.payload;
                const username = new Buffer(data.username, 'base64').toString();
                const password = new Buffer(data.password, 'base64').toString();
                const serveHawkCredentials = (credentials) => {
                    const casCookie = casCookieUtils.generate(credentials);
                    redisClient.sadd(username, credentials.id);
                    redisClient.hmset(credentials.id, credentials);
                    reply(credentials)
                        .state(config.get('casCookieName'), casCookie);
                };

                return authUtils.validateUser(username, password)
                    .then(function handleValidation(result) {
                        const errMsg = 'Invlaid username or password';
                        if (!result) {
                            reply(boom.unauthorized(errMsg));
                        } else {
                            // Generate new key pair and serve back to user
                            return authUtils.generateHawkCredentials(username)
                                .then((creds) => {
                                    return creds;
                                })
                                .then(serveHawkCredentials);
                        }
                    })
                    .catch((err) => {
                        server.log(err);
                        reply(boom.wrap(err));
                    });
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: baseUrl + '/{id}',
        config: {
            tags: ['api', 'auth'],
            notes: [
                'Auth signature required. Must match key provided in url.',
                'A `set-cookie` header in response invalidates the JWT cookie.',
                'Possible Error codes:',
                '**404** The key does not exist on the server.',
                '**401** Failed to authenticate,',
                'or the `id param` and your HAWK signature do not match.'
            ].join('<br>'),
            description: 'Logout: Remove API key from auth DB',
            handler: (request, reply) => {
                const username = request.auth.credentials.username;
                const id = request.auth.credentials.id;
                if (id !== request.params.id) {
                    reply(boom.unauthorized('Access to this key not allowed'));
                    return;
                }

                //remove id-key upon logging out
                redisClient.exists(id, (err, exist) => {
                    if (err) {
                        server.log(err);
                        reply(boom.wrap(err));
                        return;
                    }

                    if (!exist) {
                        reply(boom.unauthorized('Could not modify this key'));
                        return;
                    }

                    redisClient.del(id, (err) => {
                        if (err) {
                            server.log(err);
                            reply(boom.wrap(err));
                            return;
                        }

                        redisClient.srem(username, id, (err) => {
                            if (err) {
                                server.log(err);
                                reply(boom.wrap(err));
                                return;
                            }

                            reply('You are logged out.')
                                .code(200)
                                .state(
                                    config.get('casCookieName'),
                                    invalidCookie
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
    name: 'login'
};
