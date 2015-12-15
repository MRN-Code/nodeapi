'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.studiesSchema = joi.object().keys({
    studyId: joi.number().required(),
    label: joi.string().max(200).required(),
    description: joi.string().max(4000).allow('').allow(null),
    hrrcNum: joi.string().max(10).required(),
    endDate: joi.any().allow(null),
    expirationDate: joi.any().allow(null),
    remainingSessions: joi.number().allow(null),
    approvedSessions: joi.number().allow(null),
    piId: joi.string().max(40).required(),
    allowphiremoval: joi.string().max(1).allow('').allow(null),
    coPiId: joi.string().max(40).allow('').allow(null),
    irbNumber: joi.string().max(10).allow('').allow(null),
    statusId: joi.string().max(2).allow('').allow(null),
    primaryResearchAreaId: joi.string().max(3).allow('').allow(null),
    secondaryResearchAreaId: joi.string().max(3).allow('').allow(null),
    hrrcConsentDate: joi.any().allow(null),
    hrrcTitle: joi.string().max(200).allow('').allow(null),
    grantNumber: joi.string().max(200).allow('').allow(null),
    urlReference: joi.string().max(200).allow('').allow(null),
    urlDescription: joi.string().max(200).allow('').allow(null),
    dateCreated: joi.any().allow(null),
    sponsor: joi.string().max(200).allow('').allow(null),
    addToRecruitment: joi.string().max(1).allow('').allow(null),
    recruitmentStudyPurpose: joi.string().max(1000).allow('').allow(null),
    recruitmentProtocolSummary: joi.string().max(1000).allow('').allow(null),
    recruitmentContactName: joi.string().max(30).allow('').allow(null),
    recruitmentContactEmail: joi.string().max(30).allow('').allow(null),
    recruitmentContactPhone: joi.string().max(30).allow('').allow(null),
    expWarnEmails: joi.string().max(400).allow('').allow(null),
    radReviewEmails: joi.string().max(400).allow('').allow(null),
    reuseUrsi: joi.boolean().allow(null),
    maxEnrollment: joi.number().allow(null),
    siteId: joi.string().max(3).allow('').allow(null),
    saReviewEmails: joi.string().max(400).allow('').allow(null),
    shareInstEmails: joi.string().max(400).allow('').allow(null),
    parentStudyId: joi.number().allow(null),
    dxExcluded: joi.boolean().required(),
    dxDescription: joi.string().max(4000).allow('').allow(null),
    defaultRadiologist: joi.string().max(40).allow('').allow(null),
    hideSavenexitInSa: joi.boolean().allow(null),
    nonstopQueueInSa: joi.boolean().allow(null),
    studyCssUrl: joi.string().allow('').allow(null),
    studyDirName: joi.string().allow('').allow(null),
    selfEnrollEnabled: joi.boolean().required(),
    recruitmentStudy: joi.boolean().required(),
    trackerEnabled: joi.boolean().allow(null),
    isRdocStudy: joi.boolean().required(),
    includeAssentDate: joi.boolean().allow(null)
});
