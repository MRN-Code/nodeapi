'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.seriesDataSchema = joi.object().keys({
    seriesDataId: joi.number().required(),
    seriesId: joi.number().required(),
    scanDataTypeId: joi.number().required(),
    value: joi.string().required(),
    seriesDataType: joi.number().required(),
}).label('Series');
