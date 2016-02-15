'use strict';

const boom = require('boom');
const config = require('config');
const casCookieUtils = require('../../../utils/cas-cookie-utils.js');
const joi = require('joi');
const _ = require('lodash');
const proxy = require('../../../utils/proxy.js');

const baseUrl = '/keys';

const internals = {};

internals.credentialSchema = joi.object().keys({
    username: joi.string().required(),
    user: require('../../../controllers/users.js').userSchema,
    id: joi.string().required(),
    key: joi.string().required(),
    algorithm: joi.string().required(),
    issueTime: joi.number().required(),
    expireTime: joi.number().required(),
    studyRoles: joi.object().required()
});

internals.logOutSuccessObj = {
    message:'You are logged out.'
};

const postExample = [
    '<pre>',
        'JSON.stringify({',
            '\tusername: btoa(\'your-username\'),',
            '\tpassword: btoa(\'your-password\'),',
        '})',
    '</pre>',
].join('\n');

exports.register = function(server, options, next) {
    // Private route to get new hawk credentials
    // Requests must authenticate with a username and password
    const redisClient =  server.plugins['hapi-redis'].client;
    const authUtils = server.plugins.utilities.auth;
    const invalidCookie = casCookieUtils.invalidate();

    const LoginRecord = server.plugins.bookshelf.model('LoginRecord');

    server.state(casCookieUtils.cookieName, {
        path: '/',
        domain: config.get('cookieDomain')
    });

    /**
     * save a new LoginRecord model with `properties`
     * @param {object} properties contains props to assign to
     * new LoginRecordObject before saving
     * @return {Promise}          resolves to result of save operation
     */
    const saveRecordObj = (properties)=> {
        return LoginRecord.forge(properties).save(null, { method:'insert' });
    };

    server.route({
        method: 'OPTIONS',
        path: baseUrl + '/{id}',
        config: {
            tags: ['api', 'auth'],
            plugins: {
                'hapi-swagger': { nickname: 'options' }
            },
            description: 'Preflight route always responds with 200',
            auth: false,
            handler: function(request, reply) {
                reply('Clear for takeoff');
            }
        }
    });

    server.route({
        method: 'POST',
        path: baseUrl,
        config: {
            tags: ['api', 'auth'],
            plugins: {
                'hapi-swagger': { nickname: 'post' }
            },
            notes: [
                'Expects base64 encoded username/password in payload.',
                'Response includes a `set-cookie` header with JWT for COINS2.0',
                'Try generating some example POST JSON with:',
                postExample,
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
            response: {
                schema: internals.credentialSchema
            },
            handler: function(request, reply) {
                const data = request.payload;
                const username = data.username.toString();
                const password = data.password.toString();

                /**
                 * set recordObj attributes/values
                 */
                const  recordObj = {
                    username: data.username.toString(),
                    loginTime: new Date(),
                    ipAddr: proxy.getIpAddress(request),
                    errorCode: 0,
                    success: 1
                };

                /**
                 * log error and inserts record to db for login failure
                 */
                const handleError = (err)=> {
                    recordObj.success = 0;
                    saveRecordObj(recordObj);
                    reply(boom.wrap(err));
                };

                /**
                 * generate cookie from Hawk credentials
                 * save credentials to database
                 * reply with credentials and cookie
                 * @param  {object} credentials hawk credentials object
                 * @return {Promise}            resolves when creds are saved
                 */
                const serveHawkCredentials = (credentials) => {
                    const casCookie = casCookieUtils.generate(credentials);
                    const credentialsSaved = Promise.all([
                        redisClient.saddAsync(username, credentials.id),
                        redisClient.hmsetAsync(credentials.id, credentials)
                    ]);

                    return credentialsSaved
                        .then(() => {
                            reply(credentials)
                                .state(casCookieUtils.cookieName, casCookie);
                            return credentials;
                        });
                };

                return authUtils.validateUser(username, password)
                    .then(authUtils.generateHawkCredentials)
                    .then(serveHawkCredentials)
                    .then(_.noop)
                    .then(_.partial(saveRecordObj, recordObj))
                    .catch(handleError);
            }
        }
    });

    server.route({
        method: 'DELETE',
        path: baseUrl + '/{id}',
        config: {
            tags: ['api', 'auth'],
            plugins: {
                'hapi-swagger': { nickname: 'remove' }
            },
            validate: {
                params: {
                    id: joi.string().required()
                }
            },
            notes: [
                'Auth signature required. Must match key provided in url.',
                'A `set-cookie` header in response invalidates the JWT cookie.',
                'Possible Error codes:',
                '**404** The key does not exist on the server.',
                '**401** Failed to authenticate,',
                'or the `id param` and your HAWK signature do not match.'
            ].join('<br>'),
            description: 'Logout: Remove API key from auth DB',
            response: {
                schema: joi.compile(internals.logOutSuccessObj)
            },
            handler: (request, reply) => {
                const username = request.auth.credentials.username;
                const id = request.auth.credentials.id;
                const validateKeyToDelete = (hawkId, id) => {
                    const errMsg = 'Access to this key not allowed';
                    if (id !== hawkId) {
                        throw boom.unauthorized(errMsg);
                    }

                    return redisClient.existsAsync(id)
                        .then((exists) => {
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
                const deleteKey = () => {
                    return Promise.all([
                        redisClient.del(id),
                        redisClient.srem(username, id)
                    ]);
                };

                /**
                 * reply with success message and new invalid cookie
                 * @return {object} response, or whatever reply() returns
                 */
                const replySuccess = () => {
                    return reply(internals.logOutSuccessObj)
                        .code(200)
                        .state(
                            casCookieUtils.cookieName,
                            invalidCookie
                        );
                };

                validateKeyToDelete(id, request.params.id)
                    .then(deleteKey)
                    .then(replySuccess)
                    .catch((err) => {
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
