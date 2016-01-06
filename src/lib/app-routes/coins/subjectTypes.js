'use strict';

const boom = require('boom');
const joi = require('joi');
const Bluebird = require('bluebird');
const _ = require('lodash');

const subjectTypeController = require('../../controllers/subjectTypes.js');
/**
 * Call the toJSON method on the object
 * @param  {Object} obj object to call the toJSON method on (bookshelf)
 * @return {string}     JSON
 */
const callToJson = (obj) => {
    return obj.toJSON();
};

exports.register = function(server, options, next) {
    const path = '/subjectTypes';
    const SubjectType = server.plugins.bookshelf.model('SubjectType');
    const relations = server.plugins.relations;

    const getSchema = joi.object().keys({
        studyId: joi.number()
    });

    server.route({
        method: 'GET',
        path: path,
        config: {
            auth: false,
            tags: ['api', 'subjectType'],
            notes: [
                'query parameter  is used to restrict',
                 'output'
             ].join(' '),
            description: 'Returns a subjectType',
            validate: {
                query: getSchema
            },
            response: {
                schema: joi.array().items(subjectTypeController.subjectTypesSchema)
            },
            handler: function handleGetSubjectType(request, reply) {
                const creds = request.auth.credentials;
                const formatQuery = SubjectType.prototype._utils.formatQuery;
                if (!_.isEmpty(request.query)) {
                    new SubjectType()
                        .where(formatQuery(request.query))
                        .fetchAll(creds)
                        .then(callToJson)
                        .then(reply)
                        .catch((err) => {
                            server.log(['error', 'study'], err);
                            reply(boom.wrap(err));
                        });
                } else {
                    new SubjectType()
                        .fetchAll()
                        .then(callToJson)
                        .then(reply)
                        .catch((err) => {
                            server.log(['error', 'subjectTypes'], err);
                            reply(boom.wrap(err));
                        });


                }
            }
        }
    });

    next();
};

exports.register.attributes = {
    name: 'subjectTypes'
};
