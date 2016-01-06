'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.subjectTypesSchema = joi.object().keys({
    subjectTypeId: joi.number().required(),
    studyId: joi.number().allow(null),
    label: joi.string().max(200).required(),
    description: joi.string().max(4000).required(),
    dxExcluded: joi.boolean().required(),
    qbExcluded: joi.boolean().required(),
    hidden: joi.boolean().allow(null),
    allowP2SelfEnrollment: joi.boolean().allow(null)
});
