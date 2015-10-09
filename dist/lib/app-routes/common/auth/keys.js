'use strict';

var boom = require('boom');
var config = require('config');
var casCookieUtils = require('../../../utils/cas-cookie-utils.js');
var joi = require('joi');

var baseUrl = '/keys';

exports.register = function (server, options, next) {
    // Private route to get new hawk credentials
    // Requests must authenticate with a username and password
    var redisClient = server.plugins['hapi-redis'].client;
    var authUtils = server.plugins.utilities.auth;
    var invalidCookie = casCookieUtils.invalidate();

    server.state(config.get('casCookieName'), {
        path: '/',
        domain: config.get('cookieDomain')
    });

    server.route({
        method: 'OPTIONS',
        path: baseUrl + '/{id}',
        config: {
            tags: ['api', 'auth'],
            description: 'Preflight route always responds with 200',
            auth: false,
            handler: function handler(request, reply) {
                reply('Clear for takeoff');
            }
        }
    });

    server.route({
        method: 'POST',
        path: baseUrl,
        config: {
            tags: ['api', 'auth'],
            notes: ['Expects base64 encoded username/password in payload.', 'Response includes a `set-cookie` header with JWT for COINS2.0'].join('<br>'),
            description: 'Login: Get new API key and JWT cookie',
            auth: false,
            cors: {
                credentials: true
            },
            validate: {
                headers: true, //TODO: validate x-forwaded https header
                payload: {
                    username: joi.binary().encoding('base64').required(),
                    password: joi.binary().encoding('base64').required()
                }
            },
            handler: function handler(request, reply) {
                var data = request.payload;
                var username = data.username.toString();
                var password = data.password.toString();

                /**
                 * generate cookie from Hawk credentials
                 * save credentials to database
                 * reply with credentials and cookie
                 * @param  {object} credentials hawk credentials object
                 * @return {Promise}            resolves when creds are saved
                 */
                var serveHawkCredentials = function serveHawkCredentials(credentials) {
                    var casCookie = casCookieUtils.generate(credentials);
                    var credentialsSaved = Promise.all([redisClient.saddAsync(username, credentials.id), redisClient.hmsetAsync(credentials.id, credentials)]);

                    return credentialsSaved.then(function () {
                        reply(credentials).state(config.get('casCookieName'), casCookie);
                        return credentials;
                    });
                };

                return authUtils.validateUser(username, password).then(authUtils.generateHawkCredentials).then(serveHawkCredentials)['catch'](function (err) {
                    server.log(['error', 'login'], err);
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
            notes: ['Auth signature required. Must match key provided in url.', 'A `set-cookie` header in response invalidates the JWT cookie.', 'Possible Error codes:', '**404** The key does not exist on the server.', '**401** Failed to authenticate,', 'or the `id param` and your HAWK signature do not match.'].join('<br>'),
            description: 'Logout: Remove API key from auth DB',
            handler: function handler(request, reply) {
                var username = request.auth.credentials.username;
                var id = request.auth.credentials.id;
                var validateKeyToDelete = function validateKeyToDelete(hawkId, id) {
                    var errMsg = 'Access to this key not allowed';
                    if (id !== hawkId) {
                        throw boom.unauthorized(errMsg);
                    }

                    return redisClient.existsAsync(id).then(function (exists) {
                        if (!exists) {
                            throw boom.unauthorized('Could not locate key');
                        }

                        return exists;
                    });
                };

                /**
                 * delete the API keys witn `id` in closure
                 * @return {Promise} resolves to array of delete results
                 */
                var deleteKey = function deleteKey() {
                    return Promise.all([redisClient.del(id), redisClient.srem(username, id)]);
                };

                /**
                 * reply with success message and new invalid cookie
                 * @return {object} response, or whatever reply() returns
                 */
                var replySuccess = function replySuccess() {
                    return reply('You are logged out.').code(200).state(config.get('casCookieName'), invalidCookie);
                };

                validateKeyToDelete(id, request.params.id).then(deleteKey).then(replySuccess)['catch'](function (err) {
                    request.log(['error', 'logout'], err);
                    reply(boom.wrap(err));
                    return;
                });
            }
        }
    });

    next();
};

exports.register.attributes = {
    name: 'login'
};