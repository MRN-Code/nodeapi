'use strict';

const joi = require('joi');
const seriesSchema = require('./series');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.scansSchema = joi.object().keys({
    series: joi.array().items(seriesSchema),
    scanId: joi.number().required(),
    label: joi.string().required(),
    segmentInterval: joi.string().required(),
    studyId: joi.number().required(),
    scannerId: joi.number().required(),
    scanDate: joi.any().required(),
    operatorId: joi.any().required(),
    ursi: joi.string().required(),
    subjectHeight:joi.any().required(), //null
    subjectHeightUnits: joi.any().required(),//null
    subjectMass: joi.any().required(), //null
    subjectMassUnits: joi.any().required(),  //null
    subjectAge: joi.number().required(),
    notes: joi.any().required(),
    studyDirName: joi.any().required(),
    consentedUnderStudyId: joi.number().required(),
    billtoStudyId: joi.number().required(),
    contrastVialsUsed: joi.number().required(),
    techSlotsUsed: joi.number().required(),
    billingNotes: joi.any().required(),
    powerInjectorUsed: joi.boolean().required(),
    piDirName:joi.any().required(),
    priority: joi.any().required(),
    radiologyLoaded: joi.any().required(),
    oxygenUsed: joi.boolean().required(),
    ivSuppliesUsed: joi.boolean().required(),
    priorityNotes: joi.any().required(),
    chargeCodeId:joi.any().required(),
    assignedRadiologist: joi.any().required(),
    dxExcluded: joi.boolean().required(),
    reviewEndDate:joi.any().required(),
    reviewLoadDate: joi.any().required(),
    injectorType: joi.string().required(),
    isPhantom: joi.boolean().required(),
    fundingSource: joi.any().required(),
    projectNumber: joi.any().required(),
    chargeCode: joi.any().required()
});
