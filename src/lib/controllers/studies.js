'use strict';

const joi = require('joi');

/**
 * joi.any().required(), // TODO waiting on ‘joi.extend’
 * to handle nullable property`
 */
module.exports.studiesSchema = joi.object().keys({
    studyId: joi.number(),
    label: joi.string().max(200),
    description: joi.string().max(4000),
    hrrcNum: joi.string().max(10),
    endDate: joi.date(),
    expirationDate: joi.date(),
    remainingSessions: joi.number(),
    approvedSessions: joi.number(),
    piId: joi.string().max(40),
    allowphiremoval: joi.string().max(1),
    coPiId: joi.string().max(40),
    irbNumber: joi.string().max(10),
    statusId: joi.string().max(2),
    primaryResearchAreaId: joi.string().max(3),
    secondaryResearchAreaId: joi.string().max(3),
    hrrcConsentDate: joi.date(),
    hrrcTitle: joi.string().max(200),
    grantNumber: joi.string().max(200),
    urlReference: joi.string().max(200),
    urlDescription: joi.string().max(200),
    dateCreated: joi.date(),
    sponsor: joi.string().max(200),
    addToRecruitment: joi.string().max(1),
    recruitmentStudyPurpose: joi.string().max(1000),
    recruitmentProtocolSummary: joi.string().max(1000),
    recruitmentContactName: joi.string().max(30),
    recruitmentContactEmail: joi.string().max(30),
    recruitmentContactPhone: joi.string().max(30),
    expWarnEmails: joi.string().max(400),
    radReviewEmails: joi.string().max(400),
    reuseUrsi: joi.boolean(),
    maxEnrollment: joi.number(),
    siteId: joi.string().max(3),
    saReviewEmails: joi.string().max(400),
    shareInstEmails: joi.string().max(400),
    parentStudyId: joi.number(),
    dxExcluded: joi.boolean(),
    dxDescription: joi.string().max(4000),
    defaultRadiologist: joi.string().max(40),
    hideSavenexitInSa: joi.boolean(),
    nonstopQueueInSa: joi.boolean(),
    studyCssUrl: joi.string(),
    studyDirName: joi.string(),
    selfEnrollEnabled: joi.boolean(),
    recruitmentStudy: joi.boolean(),
    trackerEnabled: joi.boolean(),
    isRdocStudy: joi.boolean(),
    includeAssentDate: joi.boolean()
});
