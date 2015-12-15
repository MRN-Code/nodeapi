'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.subjectsSchema = joi.object().keys({
    usid: joi.string().max(9).required(),
    firstName: joi.string().max(50).allow('').allow(null),
    middleName: joi.string().max(50).allow('').allow(null),
    lastName: joi.string().max(50).allow('').allow(null),
    siteId: joi.string().max(4).required(),
    gender: joi.string().max(1).required(),
    birthDate: joi.any().required(),
    enteredDate: joi.any().required(),
    userEntered: joi.string().max(40).required(),
    oldUrsi: joi.string().max(9).allow('').allow(null),
    emailAddress: joi.string().max(200).allow('').allow(null),
    emailAddressConfirmed: joi.boolean().allow(null),
    emailAddressConfirmedDate: joi.any().allow(null),
    emailAddressConfirmedMethod: joi.string().max(500).allow('').allow(null),
    suffix: joi.string().max(40).allow('').allow(null),
    password: joi.string().allow('').allow(null),
    isP2Active: joi.boolean().allow(null),
    emailAddressConfirmationCode: joi.string().allow('').allow(null),
    agreesToFutureStudies: joi.boolean().allow(null),
    passwordResetKey: joi.string().allow('').allow(null),
    firstNameAtBirth: joi.string().max(50).allow('').allow(null),
    middleNameAtBirth: joi.string().max(50).allow('').allow(null),
    lastNameAtBirth: joi.string().max(50).allow('').allow(null),
    physicalSexAtBirth: joi.string().max(1).allow('').allow(null),
    cityBornIn: joi.string().max(80).allow('').allow(null)
});
