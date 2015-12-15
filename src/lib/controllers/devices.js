'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.devicesSchema = joi.object().keys({
    scannerId: joi.number().allow(null),
    label: joi.string().max(200).allow('').allow(null),
    description: joi.string().max(4000).allow('').allow(null),
    siteId: joi.string().allow('').allow(null),
    model: joi.string().allow('').allow(null),
    manufacturer: joi.string().max(25).allow('').allow(null),
    station: joi.string().max(25).allow('').allow(null),
    softwareVersion: joi.string().max(25).allow('').allow(null),
    fieldStrength: joi.number().allow(null),
    modalityId: joi.number().allow(null),
    modalityLabel: joi.string().max(200).allow('').allow(null),
    siteDirName: joi.string().allow('').allow(null)
});
