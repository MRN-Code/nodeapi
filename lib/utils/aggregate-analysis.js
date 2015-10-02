'use strict';

const _ = require('lodash');
const coinstacAlgorithms = require('coinstac-distributed-algorithm-set');
const osr = coinstacAlgorithms.oneShotRegression;
const laplace = coinstacAlgorithms.laplace;

const internals = {};
internals.roiMeta = {
    'Left-Hippocampus': {
        max: 1,
        min: 0
    }
};

internals.epsilon = 1;

/**
 * get array of ROI values from each analysis. Values will be in the same order
 * as internals.roiMeta
 * Also validates that all ROIs are present and numeric in each analysis
 * @param  {array} analyses array of analysis objects with result and owner prop
 * @return {array}         two dim array of ROI values for each site
 */
internals.getRoiValues = (analyses) => {
    const roiKeys = _.keys(internals.roiMeta);
    return _.map(analyses, (analysis) => {
        const roiObj = analysis.data;
        const username = analysis.username;
        return _.map(roiKeys, (key)=> {
            let errorMsg;
            if (_.isNumber(roiObj[key])) {
                return roiObj[key];
            }

            if (_.isUndefined(roiObj[key])) {
                errorMsg = `ROI '${key}' not found in ${username}'s dataset`;
                throw new Error(errorMsg);
            }

            errorMsg = `Nonnumeric value for '${key}' in ${username}'s data`;
            throw new Error(errorMsg);
        });

    });
};

/**
 * Calculate average values for each ROIs
 * Assumes that the order within each 'row' of values is the same as the order
 * of internals.roiMeta
 * @param  {array} values two dimensional array of roi values for each site
 * @return {object}       {roi1: average1, roi2: average2}
 */
internals.calculateAverage = (roiValues) => {

    // TODO: these keys should be defined in the consortium or analysis
    const roiKeys = _.keys(internals.roiMeta);
    const resultVector = osr.aggregateAvg(roiValues);
    const resultObj = _.zipObject(roiKeys, resultVector);
    return resultObj;
};

/**
 * calculate the sensitivity of the average of the ROI
 * @param  {string} roi        the name of the ROI
 * @param  {number} sampleSize number of samples on which the value was computed
 * @return {number}            the sensitivity of the average
 */
internals.calculateSensitivity = (roi, sampleSize) => {
    if (_.isUndefined(internals.roiMeta[roi])) {
        throw new Error('Unknown ROI `' + roi + '`');
    }

    const min = internals.roiMeta[roi].min;
    const max = internals.roiMeta[roi].max;
    return (max - min) / sampleSize;
};

/**
 * calculate the scale of a Laplace CDF from which to draw noise
 * returns the value of varible `b` in the inverse CDF function found at
 * https://en.wikipedia.org/wiki/Laplace_distribution
 * @param  {number} value      the value of the ROI average
 * @param  {string} roi        the name of the ROI
 * @param  {number} sampleSize number of samples on which the value was computed
 * @return {number}            the scale of the CDF
 */
internals.calculateLaplaceScale = (value, roi, sampleSize) => {
    const sensitivity = internals.calculateSensitivity(roi, sampleSize);
    return sensitivity / internals.epsilon;
};

/**
 * Add Laplace noise to the average value of the ROI
 * @param  {number} value      the value of the ROI average
 * @param  {string} roi        the name of the ROI
 * @param  {number} sampleSize number of samples on which the value was computed
 * @return {number}            the value with noise added
 */
internals.addNoise =  (value, roi, sampleSize) => {
    const scale = internals.calculateLaplaceScale(value, roi, sampleSize);
    return value + laplace.noise(scale);
};

/**
 * run a differentially private average of the analyses
 * @param  {array} analyses all analyses to be averaged
 * @return {object}      an object containing the differentially private average
 *                       of all ROIs in each analysis result
 */
const run = (analyses) => {
    const values = internals.getRoiValues(analyses);
    const averages = internals.calculateAverage(values);
    const sampleSize = analyses.length;

    return _.mapValues(averages, (value, roi) => {
        return internals.addNoise(value, roi, sampleSize);
    });
};

module.exports = run;
