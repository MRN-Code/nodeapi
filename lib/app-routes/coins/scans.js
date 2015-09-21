'use strict';

const boom = require('boom');
const joi = require('joi');
const Bluebird = require('bluebird');
const _ = require('lodash');

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

    const internals = {};

    internals.scansSchema = joi.object().keys({
        scanId: joi.number().required(),
        label: joi.string().required(),
        segmentInterval: joi.string().required(),
        studyId: joi.number().required(),
        scannerId: joi.number().required(),
        scanDate: joi.date().required(),
        operatorId: joi.string().required(),
        ursi: joi.string().required(),
        subjectHeight:joi.any().required(), //null
        subjectHeightUnits: joi.any().required(),//null
        subjectMass: joi.any().required(), //null
        subjectMassUnits: joi.any().required(),  //null
        subjectAge: joi.number().required(),
        notes: joi.string().required().allow(''),
        studyDirName: joi.string().required().allow(''),
        consentedUnderStudyId: joi.number().required(),
        billtoStudyId: joi.number().required(),
        contrastVialsUsed: joi.number().required(),
        techSlotsUsed: joi.number().required(),
        billingNotes: joi.string().required().allow(''),
        powerInjectorUsed: joi.boolean().required(),
        piDirName:joi.any().required(),
        priority: joi.any().required(),
        radiologyLoaded: joi.any().required(),
        oxygenUsed: joi.boolean().required(),
        ivSuppliesUsed: joi.boolean().required(),
        priorityNotes: joi.any().required(),
        chargeCodeId:joi.any().required(),
        assignedRadiologist: joi.string().required(),
        dxExcluded: joi.boolean().required(),
        reviewEndDate:joi.any().required(),
        reviewLoadDate: joi.any().required(),
        injectorType: joi.string().required(),
        isPhantom: joi.boolean().required(),
        fundingSource: joi.string().required(),
        projectNumber: joi.any().required(),
        chargeCode: joi.string().required()

    });

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
            response:{
                schema:joi.array().items(internals.scansSchema)
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
            },
            response:{
                status:200
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
