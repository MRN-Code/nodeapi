'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.sitesSchema = joi.object().keys({
    siteId: joi.string().max(3).required(),
    label: joi.string().max(25).required(),
    description: joi.string().max(4000).required(),
    ursiPrefix: joi.string().max(4).allow('').allow(null),
    timezoneName: joi.string().allow('').allow(null),
    siteDirName: joi.string().allow('').allow(null)
});
