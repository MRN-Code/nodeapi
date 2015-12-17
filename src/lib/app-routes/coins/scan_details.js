'use strict';

const boom = require('boom');
const joi = require('joi');
const _ = require('loadash');
const Bluebird = require('bluebird');

exports.register = function(server, options, next) {

    const path = '/scans/{id}';
    const Series = server.plugins.bookshelf.model('Series');

    server.route({
        method: 'GET',
        path: path,
        config: {
            tags: ['api', 'scans'],
            notes: [
                'query parameters is scan_id',
                 'output'
             ].join(' '),
            description: 'Returns details of scans',
            validate: {
                query: null
            },
            response: {
                schema: null
            },
            handler: function handleGetScansDetails(request, reply) {
                const getReadScanDetails = () => {
                    return Series
                    .query('where', 'scan_id', '=', request.params.id)
                    .fetchAll({withRelated:'seriesdata'})
                    .then(function(data) {
                      console.log(JSON.stringify(data));
                  });
                };

                getReadScanDetails()
                .then(reply)
                .catch((err) => {
                    server.log(['error', 'scan_details'], err);
                    reply(boom.wrap(err));
                });

            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'scans_details'
};
