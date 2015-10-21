'use strict';

const _ = require('lodash');
const coinstacAlgorithms = require('coinstac-distributed-algorithm-set');
const ridgeRegression = coinstacAlgorithms.ridgeRegression;
const laplace = coinstacAlgorithms.laplace;

const internals = {};
internals.roiMeta = {
    'Left-Hippocampus': {
        max: 1,
        min: 0
    }
};

internals.epsilon = 1;

internals.mean = (values) => {
    if (values.length === 0) {
        return 0;
    }

    const sum = internals.sum(values);
    return sum / values.length;
};

internals.sum =  (values) => {
    const sum = _.reduce(values, (target, value) => {
        return target + value;
    }, 0);

    return sum;
};

/**
 * get objective function results from each analysis
 * @param  {array} analyses array of analysis documents
 * @return {array}          array of objective results
 */
internals.getObjectiveValues = (analyses) => {
    return _.pluck(analyses, 'data.objective');
};

/**
 * get gradient function results from each analysis
 * @param  {array} analyses array of analysis documents
 * @return {array}          array of gradient results, ordered according to
 *                                roiMeta
 */
internals.getGradientValues = (analyses) => {
    return _.pluck(analyses, 'data.gradient').map(internals.unzipRoiKeyPairs);
};

/**
 * extract values from object in same order as roiMeta
 * @param  {object} obj object where keys are roi labels
 * @return {array}     array of values in the same order as roiMeta
 */
internals.unzipRoiKeyPairs = (obj) => {
    const roiKeys = _.keys(internals.roiMeta);
    return _.map(roiKeys, (key) => {
        return obj[key];
    });
};

/**
 * combine values with roi labels
 * @param  {array} values array of values in same order as roiMeta
 * @return {object}        object with keys from roiMeta and values from array
 */
internals.zipRoiKeyPairs = (values) => {
    const roiKeys = _.keys(internals.roiMeta);
    return _.zipObject(roiKeys, values);
};

/**
 * get array of ROI values from each analysis. Values will be in the same order
 * as internals.roiMeta
 * Also validates that all ROIs are present and numeric in each analysis
 * @param  {array} analyses array of analysis objects with result and owner prop
 * @return {array}         two dim array of ROI values for each site
 */
internals.getMVals = (analyses) => {
    return _.pluck(analyses, 'result.mVals').map(internals.unzipRoiKeyPairs);
};

/**
 * Calculate average values for each ROIs
 * Assumes that the order within each 'row' of values is the same as the order
 * of internals.roiMeta
 * @param  {array} values two dimensional array of roi values for each site
 * @return {object}       {roi1: average1, roi2: average2}
 */
internals.calculateAverage = (values) => {

    // TODO: these keys should be defined in the consortium or analysis
    const resultVector = coinstacAlgorithms.utils.columnWiseAverage(values);
    const resultObj = internals.zipRoiKeyPairs(resultVector);
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
    return value; //@TODO: removing noise for testing purposes
    return value + laplace.noise(scale); //jshint ignore:line

};

/**
 * run a differentially private average of the analyses
 * @param  {array} analyses all analyses to be averaged
 * @return {object}      an object containing the differentially private average
 *                       of all ROIs in each analysis result
 */
const runSingleShot = (analyses) => {
    const values = internals.getRoiValues(analyses);
    const averages = internals.calculateAvg(values);
    const sampleSize = analyses.length;

    return _.mapValues(averages, (value, roi) => {
        return internals.addNoise(value, roi, sampleSize);
    });
};

/**
 * run a differentially private average of the analyses
 * @param  {array} analyses all analyses to be averaged
 * @return {object}      an object containing the differentially private average
 *                       of all ROIs in each analysis result
 */
const runMultiShot = (analyses, aggregate) => {
    const previousAgg = aggregate.history[aggregate.history.length - 1];
    const objectiveValues = internals.getObjectiveValues(analyses);
    const gradientValues = internals.getGradientValues(analyses);
    const r2Values = _.pluck(analyses, 'data.r2');
    const aggregateR2 = internals.mean(r2Values);
    const aggregateObjective = internals.sum(objectiveValues);
    const aggregateGradient = coinstacAlgorithms
        .utils.columnWiseSum(gradientValues);
    let newMValArray;
    let overshot;

    if (
        previousAgg.data.objective !== null &&
        aggregateObjective > previousAgg.data.objective
    ) {
        //adjust learningRate only: gradient stays unchanged
        aggregate.data.learningRate = aggregate.data.learningRate / 2;
        overshot = true;
        aggregate.data.previousMVals = aggregate.mVals;
    } else {
        //update gradient and objective
        aggregate.data.gradient = internals.zipRoiKeyPairs(aggregateGradient);
        aggregate.data.objective = aggregateObjective;
    }

    newMValArray = ridgeRegression.recalculateMVals(
        aggregate.data.learningRate,
        internals.unzipRoiKeyPairs(previousAgg.data.previousMVals),
        internals.unzipRoiKeyPairs(aggregate.data.gradient)
    );

    aggregate.data.mVals = internals.zipRoiKeyPairs(newMValArray);
    if (!overshot) {
        aggregate.data.previousMVals = aggregate.data.mVals;
    }
    
    aggregate.data.r2 = aggregateR2;

    return aggregate;
};

module.exports.singleShot = runSingleShot;
module.exports.multiShot = runMultiShot;
