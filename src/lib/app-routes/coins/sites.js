'use strict';

const boom = require('boom');
const joi = require('joi');
const Bluebird = require('bluebird');
const _ = require('lodash');

const siteController = require('../../controllers/sites.js');
/**
 * Call the toJSON method on the object
 * @param  {Object} obj object to call the toJSON method on (bookshelf)
 * @return {string}     JSON
 */
const callToJson = (obj) => {
    return obj.toJSON();
};

exports.register = function(server, options, next) {
    const path = '/sites';
    const Site = server.plugins.bookshelf.model('Site');
    const relations = server.plugins.relations;

    const getSchema = joi.object().keys({
        siteId: joi.number()
    });

    server.route({
        method: 'GET',
        path: path,
        config: {
            auth: false,
            tags: ['api', 'site'],
            notes: [
                'query parameter site_id is used to restrict',
                 'output'
             ].join(' '),
            description: 'Returns a site',
            validate: {
                query: getSchema
            },
            response: {
                schema: joi.array().items(siteController.sitesSchema)
            },
            handler: function handleGetSite(request, reply) {
                //const creds = request.auth.credentials;
                const creds = {username: 'mochatest'};
                const formatQuery = Site.prototype._utils.formatQuery;
                if (!_.isEmpty(request.query)) {
                    new Site()
                        .where(formatQuery(request.query))
                        .fetchAll()
                        .then(callToJson)
                        .then(reply)
                        .catch((err) => {
                            server.log(['error', 'study'], err);
                            reply(boom.wrap(err));
                        });
                } else {
                    new Site()
                        .fetchAll()
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
    name: 'sites'
};
