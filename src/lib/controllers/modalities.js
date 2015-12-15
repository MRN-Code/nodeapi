'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.modalitiesSchema = joi.object().keys({
    modalityId: joi.number().required(),
    label: joi.string().max(200).required(),
    description: joi.string().max(4000).allow('').allow(null),
    acquisitionLevel: joi.string().max(10).required(),
    parentModalityId: joi.number().allow(null),
    attributeView: joi.string().max(100).allow('').allow(null),
    attributeViewIdColumn: joi.string().allow('').allow(null),
    dxFilterOrder: joi.any().allow(null)
});
