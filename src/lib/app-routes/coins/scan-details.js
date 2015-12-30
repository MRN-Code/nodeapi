'use strict';

const boom = require('boom');
const joi = require('joi');
const _ = require('lodash');
const Bluebird = require('bluebird');

exports.register = function(server, options, next) {

    const path = '/scans/{id}/';
    const Scan = server.plugins.bookshelf.model('Scan');
    const relations = server.plugins.relations;

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
                schema: null
            },
            handler: function handleGetScansDetails(request, reply) {
                debugger;
                const creds = request.auth.credentials;
                console.log('------' + request.params.id + '--------');

                const getReadScanDetails = () => {
                    return Scan.where({scan_id: request.params.id})
                    .read(creds,{withRelated:['series','series.seriesData']})
                    .then(function(data) {
                      console.log(JSON.stringify(data));
                      return data;
                  });
                };

                getReadScanDetails()
                .then(reply)
                .catch((err) => {
                    console.log('-------error here -----');
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
