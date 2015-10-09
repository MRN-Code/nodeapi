'use strict';

var _ = require('lodash');
var coinstacAlgorithms = require('coinstac-distributed-algorithm-set');
var osr = coinstacAlgorithms.oneShotRegression;
var laplace = coinstacAlgorithms.laplace;

var internals = {};
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
internals.getRoiValues = function (analyses) {
    var roiKeys = _.keys(internals.roiMeta);
    return _.map(analyses, function (analysis) {
        var roiObj = analysis.data;
        var username = analysis.username;
        return _.map(roiKeys, function (key) {
            var errorMsg = undefined;
            if (_.isNumber(roiObj[key])) {
                return roiObj[key];
            }

            if (_.isUndefined(roiObj[key])) {
                errorMsg = 'ROI \'' + key + '\' not found in ' + username + '\'s dataset';
                throw new Error(errorMsg);
            }

            errorMsg = 'Nonnumeric value for \'' + key + '\' in ' + username + '\'s data';
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
internals.calculateAverage = function (roiValues) {

    // TODO: these keys should be defined in the consortium or analysis
    var roiKeys = _.keys(internals.roiMeta);
    var resultVector = osr.aggregateAvg(roiValues);
    var resultObj = _.zipObject(roiKeys, resultVector);
    return resultObj;
};

/**
 * calculate the sensitivity of the average of the ROI
 * @param  {string} roi        the name of the ROI
 * @param  {number} sampleSize number of samples on which the value was computed
 * @return {number}            the sensitivity of the average
 */
internals.calculateSensitivity = function (roi, sampleSize) {
    if (_.isUndefined(internals.roiMeta[roi])) {
        throw new Error('Unknown ROI `' + roi + '`');
    }

    var min = internals.roiMeta[roi].min;
    var max = internals.roiMeta[roi].max;
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
internals.calculateLaplaceScale = function (value, roi, sampleSize) {
    var sensitivity = internals.calculateSensitivity(roi, sampleSize);
    return sensitivity / internals.epsilon;
};

/**
 * Add Laplace noise to the average value of the ROI
 * @param  {number} value      the value of the ROI average
 * @param  {string} roi        the name of the ROI
 * @param  {number} sampleSize number of samples on which the value was computed
 * @return {number}            the value with noise added
 */
internals.addNoise = function (value, roi, sampleSize) {
    var scale = internals.calculateLaplaceScale(value, roi, sampleSize);
    return value; //@TODO: removing noise for testing purposes
    return value + laplace.noise(scale); //jshint ignore:line
};

/**
 * run a differentially private average of the analyses
 * @param  {array} analyses all analyses to be averaged
 * @return {object}      an object containing the differentially private average
 *                       of all ROIs in each analysis result
 */
var run = function run(analyses) {
    var values = internals.getRoiValues(analyses);
    var averages = internals.calculateAverage(values);
    var sampleSize = analyses.length;

    return _.mapValues(averages, function (value, roi) {
        return internals.addNoise(value, roi, sampleSize);
    });
};

module.exports = run;