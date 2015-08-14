'use strict';

const boom = require('boom');
const joi = require('joi');

exports.register = function(server, options, next) {
    const path = '/scans';
    const Scan = server.plugins.bookshelf.model('Scan');
    const relations = server.plugins.relations;
    const getSchema = joi.object().keys({
        study_id: joi.number(),
        ursi: joi.string().min(9).max(9)
    });

    server.route({
        method: 'GET',
        path: path,
        config: {
            tags: ['api', 'scans'],
            notes: 'query parameters study_id and'
                + ' ursi are used to restrict output',
            description: 'Returns a collection of scans',
            validate: {
                query: getSchema
            }
        },
        handler: (request, reply) => {
            if (request.query.ursi) {
                new Scan()
                    .where({
                        study_id: request.query.study_id,
                        ursi: request.query.ursi
                    })
                    .readAll(request.auth.credentials)
                    .then(function (scanCollection) {
                        reply(scanCollection);
                    }).catch((err) => {
                        reply(boom.wrap(err));
                    });
            } else if (request.query.study_id) {
                new Scan()
                    .where({
                        study_id: request.query.study_id
                    })
                    .readAll(request.auth.credentials)
                    .then(function (scanCollection) {
                        reply(scanCollection);
                    }).catch((err) => {
                        reply(boom.wrap(err));
                    });
            } else { 
                return new Promise((res, rej) => { 
                    relations.study('What can %s read_Scan from?',
                       request.auth.credentials.username,
                       (err, studies) => {
                           if (err) rej(err);
                           res(studies);
                       });
                })
                .then((studies) => {
                    return new Scan()
                        .query('whereIn', 'study_id', studies)
                        .readAll(request.auth.credentials)
                        .then(function (scanCollection) {
                            reply(scanCollection.toJSON());
                        });
                })
                .catch((err) => {
                    reply(boom.wrap(err));
                });
            }
        }
    });

    const postSchema = joi.object().keys({
        scan_id: joi.number().required(),
        label: joi.string().required(),
        study_id: joi.number().required(),
        scanner_id: joi.number().required(),
        scan_date: joi.date().required(),
        ursi: joi.string().min(9).max(9).required(),
        subject_age: joi.number().required()
    });

    server.route({
        method: 'POST',
        path: path,
        config: {
            tags: ['api', 'scans'],
            description: 'Saves a scan',
            validate: {
                query: postSchema
            }
        },
        handler: (request, reply) => {
            new Scan.forge(request.payload).save()
                .then(() => {
                    reply('saved');
                }).catch((err) => {
                    reply(boom.wrap(err));
                });
        }
    });

    next();
};

exports.register.attributes = {
    name: 'scans'
};
