'use strict';
const boom = require('boom');
const joi = require('joi');
const _ = require('lodash');

const internals = {};

internals.fileRecordSchemaRecieved = joi.object().keys({
    attributes: joi.string().required(),
    ursi: joi.string().length(9).required(),
    deviceModalityDetailId: joi.number().required(),
    segmentIntervalId: joi.number().required(),
});

internals.fileRecordSchema = joi.object().keys({
    id: joi.number().required(),
    attributes: joi.string().required(),
    usid: joi.string().length(9).required(),
    deviceModalityDetailId: joi.number().required(),
    segmentIntervalId: joi.number().required(),
});

module.exports.post = {
    tags: ['api', 'file', 'file records', 'record'],
    description: 'Validates and/or creates a file record for file uploads',
    auth: false,
    validate: {
        payload: internals.fileRecordSchemaRecieved
    },
    response: {
        schema: internals.fileRecordSchema
    },
    handler: (request, reply) => {
        const bookshelf = request.server.plugins.bookshelf;
        const FileRecord = bookshelf.model('FileRecord');
        const SubjectTypeDetails = bookshelf.model('SubjectTypeDetails');

        if (true) {//_.get(request, 'query.dryrun') === true) {
            new SubjectTypeDetails()
            .query('where', 'ursi', request.payload.ursi)
            .fetch()
            .then(subjectDetail => {
                if (!subjectDetail) {
                    throw new Error('Invalid ursi');
                }

                const fileRecord = _.omit(request.payload, 'ursi');
                fileRecord.usid = subjectDetail.get('usid');

                bookshelf.transaction((transaction) => {
                    FileRecord.forge()
                    .save(fileRecord, {transacting: transaction})
                    .then(() => {
                        reply({filerecord: fileRecord, dryrun: true});
                        transaction.rollback();
                    })
                    .catch((err) => {
                        request.log(
                            ['error', 'filerecord'],
                            'Validation error: ' + err.message
                        );
                        reply(boom.wrap(err));
                        transaction.rollback();
                    });
                })
                .catch((err) => {
                    console.dir(err);
                    request.log(
                        ['error', 'filerecord'],
                        'Validation error: ' + err.message
                    );
                    reply(boom.wrap(err));
                });
            })
            .catch((err) => {
                request.log(['error', 'filerecord'], 'Validation error: ' +
                    err.message);
                reply(boom.wrap(err));
            });
        }
    }
};
