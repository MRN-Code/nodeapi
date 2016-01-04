'use strict';

const boom = require('boom');
const joi = require('joi');
const _ = require('lodash');
const Bluebird = require('bluebird');

const scanController = require('../../controllers/scans.js');
const seriesController = require('../../controllers/series.js');
const seriesDataController = require('../../controllers/seriesData.js');

exports.register = function(server, options, next) {

    const path = '/scans/{id}/';
    const Scan = server.plugins.bookshelf.model('Scan');

    const getSchema = joi.object().keys({
        studyId: joi.number(),
        ursi: joi.string().min(9).max(9)
    });

    server.route({
        method: 'GET',
        path: path,
        config: {
            tags: ['api', 'scans-details'],
            notes: [
                'query parameters is scan_id'
             ].join(' '),
            description:'Returns metadata for single scans and all of its series and series data',
            validate: {
                params:joi.object().keys({
                    id: joi.number().required()
                })
            },
            response: {
                schema: joi.object().keys({
                    schema: scanController.scansSchema,
                    series: joi.array().items(seriesController.seriesSchema),
                    seriesData: joi.array().items(seriesDataController.seriesDataSchema)
                })
            },
            handler: function handleGetScansDetails(request, reply) {
                const creds = request.auth.credentials;
                const getReadScanDetails = () => {
                    return Scan.where({scan_id: request.params.id})
                    .read(creds, { withRelated:['series','series.seriesData'], require: true})
                    .then(function(data) {
                      return data;
                  });
                };

                getReadScanDetails()
                .then(reply)
                .catch((err) => {
                    server.log(['error', 'scan-details'], err.stack);
                    reply(boom.wrap(err));
                });

            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'scans-details'
};
