'use strict';

const boom = require('boom');
const joi = require('joi');
const Bluebird = require('bluebird');
const _ = require('lodash');

const scanController = require('../../controllers/scans.js');
/**
 * Call the toJSON method on the object
 * @param  {Object} obj object to call the toJSON method on (bookshelf)
 * @return {string}     JSON
 */
const callToJson = (obj) => {
    return obj.toJSON();
};

exports.register = function(server, options, next) {
    const path = '/scans';
    const Scan = server.plugins.bookshelf.model('Scan');
    const relations = server.plugins.relations;

    /**
     * Get the studies that the user is allowed to read scans from
     * @return {Promise} a promise that resolves to an array of studyIds
     */
    const getReadScanStudies = (username) => {
        return new Bluebird((res, rej) => {
            relations.study('What can %s read_Scan from?',
               username,
               (err, studies) => {
                   if (err) rej(err);
                   res(studies);
               });
        });
    };

    /**
     * get all scans in the specified studies
     * @param  {[int]} studies array of studyIds (int)
     * @param  {boolean} returnJson return JSON instead of raw collection
     * @return {Promise} A Promise that resolves to json or collection of scans
     */
    const readAllScansInStudies = (credentials, studies) => {
        return new Scan()
            .query('whereIn', 'study_id', studies)
            .readAll(credentials);
    };

    const getSchema = joi.object().keys({
        studyId: joi.number(),
        ursi: joi.string().min(9).max(9)
    });

    server.route({
        method: 'GET',
        path: path,
        config: {
            tags: ['api', 'scans'],
            notes: [
                'query parameters study_id and ursi are used to restrict',
                 'output'
             ].join(' '),
            description: 'Returns a collection of scans',
            validate: {
                query: getSchema
            },
            response: {
                schema: joi.array().items(scanController.scansSchema)
            },
            handler: function handleGetScans(request, reply) {
                const creds = request.auth.credentials;
                const formatQuery = Scan.prototype._utils.formatQuery;
                if (!_.isEmpty(request.query)) {
                    new Scan()
                        .where(formatQuery(request.query))
                        .readAll(creds)
                        .then(callToJson)
                        .then(reply)
                        .catch((err) => {
                            server.log(['error', 'scans'], err);
                            reply(boom.wrap(err));
                        });
                } else {
                    getReadScanStudies(request.auth.credentials.username)
                        .then(_.partial(readAllScansInStudies, creds))
                        .then(callToJson)
                        .then(reply)
                        .catch((err) => {
                            server.log(['error', 'scans'], err);
                            reply(boom.wrap(err));
                        });
                }
            }
        }
    });

    const postSchema = joi.object().keys({
        scanId: joi.number().required(),
        label: joi.string().required(),
        studyId: joi.number().required(),
        scannerId: joi.number().required(),
        scanDate: joi.date().required(),
        ursi: joi.string().min(9).max(9).required(),
        subjectAge: joi.number().required()
    });

    server.route({
        method: 'POST',
        path: path,
        config: {
            tags: ['api', 'scans'],
            description: 'Saves a scan',
            validate: {
                payload: postSchema
            }
        },
        handler: (request, reply) => {
            new Scan.forge(request.query)
                .then(_.partial(reply, 'saved'))
                .catch((err) => {
                    reply(boom.wrap(err));
                });
        }
    });

    next();
};

exports.register.attributes = {
    name: 'scans'
};
