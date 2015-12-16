'use strict';

// require 3rd party packages
//TODO: remove any unused packages
const joi = require('joi');

/**
 * Call the toJSON method on the object
 * @param  {Object} obj object to call the toJSON method on (bookshelf)
 * @return {string}     JSON
 */
const callToJson = (obj) => {
    return obj.toJSON();
};

const metricsSchema = joi.object({
    studies: joi.string().required(),
    sites: joi.string().required(),
    assessments: joi.string().required(),
    scans: joi.string().required(),
    instruments: joi.string().required(),
    participants: joi.string().required(),
    uniqueParticipantEnrollments: joi.string().required(),
    dxParentStudies: joi.string().required(),
    dxStudies: joi.string().required(),
    dxSubjects: joi.string().required(),
    dxAsmts: joi.string().required(),
    dxScans: joi.string().required()
});

//export plugin registration function
exports.register = (server, options, next) =>  {
    const CoinsMetrics = server.plugins.bookshelf.model('CoinsMetrics');
    server.route({
        path: '/coinsmetrics',
        method: 'GET',
        config: {
            tags: ['api'],
            notes: [
                'Provides COINS usage metrics including',
                'Number of users, sites, subjects, etc.',
                'This route is open to the public. No Auth required'
            ].join('<br>'),
            description: 'Provides COINS usage metrics',
            auth: false,
            response: {
                schema: metricsSchema
            },
            handler: (request, reply) => {
                return CoinsMetrics.forge().fetch()
                    .then(callToJson)
                    .then(reply);
            }
        }
    });
    next();
};

exports.register.attributes = {
    //TODO: update name
    name: 'example route'
};
