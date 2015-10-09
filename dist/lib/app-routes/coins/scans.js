'use strict';

var boom = require('boom');
var joi = require('joi');
var Bluebird = require('bluebird');
var _ = require('lodash');

/**
 * Call the toJSON method on the object
 * @param  {Object} obj object to call the toJSON method on (bookshelf)
 * @return {string}     JSON
 */
var callToJson = function callToJson(obj) {
    return obj.toJSON();
};

exports.register = function (server, options, next) {
    var path = '/scans';
    var Scan = server.plugins.bookshelf.model('Scan');
    var relations = server.plugins.relations;

    /**
     * Get the studies that the user is allowed to read scans from
     * @return {Promise} a promise that resolves to an array of studyIds
     */
    var getReadScanStudies = function getReadScanStudies(username) {
        return new Bluebird(function (res, rej) {
            relations.study('What can %s read_Scan from?', username, function (err, studies) {
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
    var readAllScansInStudies = function readAllScansInStudies(credentials, studies) {
        return new Scan().query('whereIn', 'study_id', studies).readAll(credentials);
    };

    var getSchema = joi.object().keys({
        studyId: joi.number(),
        ursi: joi.string().min(9).max(9)
    });

    server.route({
        method: 'GET',
        path: path,
        config: {
            tags: ['api', 'scans'],
            notes: ['query parameters study_id and ursi are used to restrict', 'output'].join(' '),
            description: 'Returns a collection of scans',
            validate: {
                query: getSchema
            },
            handler: function handleGetScans(request, reply) {
                var creds = request.auth.credentials;
                var formatQuery = Scan.prototype._utils.formatQuery;
                if (!_.isEmpty(request.query)) {
                    new Scan().where(formatQuery(request.query)).readAll(creds).then(callToJson).then(reply)['catch'](function (err) {
                        server.log(['error', 'scans'], err);
                        reply(boom.wrap(err));
                    });
                } else {
                    getReadScanStudies(request.auth.credentials.username).then(_.partial(readAllScansInStudies, creds)).then(callToJson).then(reply)['catch'](function (err) {
                        server.log(['error', 'scans'], err);
                        reply(boom.wrap(err));
                    });
                }
            }
        }
    });

    var postSchema = joi.object().keys({
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
        handler: function handler(request, reply) {
            new Scan.forge(request.query).then(_.partial(reply, 'saved'))['catch'](function (err) {
                reply(boom.wrap(err));
            });
        }
    });

    next();
};

exports.register.attributes = {
    name: 'scans'
};