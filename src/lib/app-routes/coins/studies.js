'use strict';

const boom = require('boom');
const joi = require('joi');
const Bluebird = require('bluebird');
const _ = require('lodash');

const studyController = require('../../controllers/studies.js');
/**
 * Call the toJSON method on the object
 * @param  {Object} obj object to call the toJSON method on (bookshelf)
 * @return {string}     JSON
 */
const callToJson = (obj) => {
    return obj.toJSON();
};

exports.register = function(server, options, next) {
    const path = '/studies';
    const Study = server.plugins.bookshelf.model('Study');
    const relations = server.plugins.relations;

    /**
     * Get the studies that the user is allowed to read from
     * @return {Promise} a promise that resolves to an array of studyIds
     */
    const getReadStudies = (username) => {
        return new Bluebird((res, rej) => {
            relations.study('What can %s read_Study from?',
               username,
               (err, studies) => {
                   if (err) rej(err);
                   console.dir(studies);
                   res(studies);
               });
        });
    };

    const getSchema = joi.object().keys({
        studyId: joi.number()
    });

    server.route({
        method: 'GET',
        path: path,
        config: {
            auth: false,
            tags: ['api', 'study'],
            notes: [
                'query parameter study_id is used to restrict',
                 'output'
             ].join(' '),
            description: 'Returns a study',
            validate: {
                query: getSchema
            },
            response: {
                schema: joi.array().items(studyController.studiesSchema)
            },
            handler: function handleGetStudy(request, reply) {
                //const creds = request.auth.credentials;
                const creds = {username: 'mochatest'};
                const formatQuery = Study.prototype._utils.formatQuery;
                if (!_.isEmpty(request.query)) {
                    new Study()
                        .where(formatQuery(request.query))
                        .readAll(creds)
                        .then(callToJson)
                        .then(reply)
                        .catch((err) => {
                            server.log(['error', 'study'], err);
                            reply(boom.wrap(err));
                        });
                } else {
                    getReadStudies(creds.username).
                        then(function (studies) {
                            return new Study().
                                where('study_id', 'in', studies)
                                .readAll(creds)
                        })
                        .then(callToJson)
                        .then(reply)
                        .catch((err) => {
                            server.log(['error', 'studies'], err);
                            reply(boom.wrap(err));
                        });


                }
            }
        }
    });

    next();
};

exports.register.attributes = {
    name: 'studies'
};
