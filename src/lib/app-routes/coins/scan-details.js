'use strict';

const boom = require('boom');
const joi = require('joi');
const _ = require('lodash');

const scanController = require('../../controllers/scans.js');

exports.register = function (server, options, next) {

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
      tags: ['api', 'scan-details'],
      notes: [
        'query parameters is scan_id'
      ].join(' '),
      description:'Returns metadata for single scans and all of its series and series data',
      validate: {
        params:joi.object().keys({
          id: joi.number().required()
        })
      },
      plugins: {
        'hapi-swagger': { nickname: 'get' }
      },
      response: {
        schema: joi.array().items(scanController.scansSchema)
      },
      handler: function handleGetScansDetails(request, reply) {
        const creds = request.auth.credentials;
        const getReadScanDetails = () => {
                    /* jscs: disable */
          return Scan.where({ scan_id: request.params.id }) // jshint ignore:line
                    .read(creds, { withRelated: ['series', 'series.seriesData'], require: true })
                    .then((qryReslt) => [qryReslt.toJSON()]);
                    /* jscs: enable */
        };

                // @TODO distinguish between application error and user request error
        getReadScanDetails()
                .then(reply)
                .catch((err) => reply(boom.wrap(err)));
      }
    }
  });
  next();
};

exports.register.attributes = {
  name: 'scan-details'
};
