'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.seriesSchema = joi.object().keys({
  seriesId: joi.number().required(),
  modalityId: joi.number().required(),
  scanId: joi.number().required(),
  basePath: joi.string().required(),
  studyCodeId: joi.number().required(),
  usable: joi.string().required(),
  notes: joi.string().required(),
  sortOrder: joi.number().required(),
  labelId: joi.number().required(),
  dxExcluded: joi.boolean().required(),
});
