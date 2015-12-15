'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.studyIntervalsSchema = joi.object().keys({
    studyId: joi.number().required(),
    label: joi.string().max(50).required(),
    timeFromBaseline: joi.number().required(),
    timeUnit: joi.string().max(10).allow('').allow(null),
    segmentInterval: joi.string().max(20).required(),
    isHidden: joi.boolean().allow(null),
    segmentIntervalId: joi.any().required()
});
