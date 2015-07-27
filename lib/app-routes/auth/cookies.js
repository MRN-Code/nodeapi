'use strict';

const boom = require('boom');
const casCookieUtils = require('../../utils/cas-cookie-utils.js');
const _ = require('lodash');

const removableJwtKeys = [];

exports.register = (server, options, next) =>  {
    const redisClient = server.plugins['hapi-redis'].client;
    server.route({
        path: '/cookies/{id}',
        method: 'GET',
        config: {
            tags: ['api', 'auth', '2.0backwardscompat'],
            notes: 'Only inteded for use by COINS 2.0',
            description: 'Validate, and get new cookie with updated expiration',
            auth: false,
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
