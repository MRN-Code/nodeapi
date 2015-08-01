'use strict';

const boom = require('boom');
const casCookieUtils = require('../../utils/cas-cookie-utils.js');
const _ = require('lodash');
const joi = require('joi');

const removableJwtKeys = [];

exports.register = (server, options, next) =>  {
    const redisClient = server.plugins['hapi-redis'].client;
    server.route({
        path: '/cookies/{id}',
        method: 'GET',
        config: {
            tags: ['api', 'auth', '2.0backwardscompat'],
            notes: [
                'Only intended for use by COINS 2.0',
                'Possible error codes:',
                '**400**: Invalid cookie value.',
                '**401**: Expired cookie.',
                '**401**: No matching API key found. (probably logged out)'
            ].join('<br>'),
            description: 'Validate cookie, returs value with new `expires at`',
            auth: false,
            validate: {
                params: { id: joi.string('base64').required() }
            },
            handler: (request, reply) => {
                casCookieUtils.verifyAndParse(request.params.id, redisClient)
                    .then((parsedJwt) => {
                        const cleanJwt = _.omit(parsedJwt, removableJwtKeys);
                        reply(casCookieUtils.generate(cleanJwt));
                        return;
                    }).catch((err) => {
                        if (err.name) {
                            if (err.name === 'TokenExpiredError') {
                                reply(boom.unauthorized(err.message));
                                return;
                            }

                            if (err.name === 'JsonWebTokenError') {
                                reply(boom.badRequest(err.message));
                                return;
                            }

                            if (err.name === 'HawkKeyNotFound') {
                                reply(boom.unauthorized(err.message));
                                return;
                            }
                        }

                        request.log(['error', 'cookies'], err.message);
                        reply(boom.wrap(err));
                    });
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'auth/cookies'
};
