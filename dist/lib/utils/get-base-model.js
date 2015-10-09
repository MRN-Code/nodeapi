'use strict';
var _ = require('lodash');

var internals = {};

/**
 * helper function to convert object keys to snake case
 * useful for passing camelCase object names into bookshelf queries
 * @param  {object} obj the object to process
 * @return {object}     the processed object
 */
internals.keysToSnakeCase = function (obj, recurse) {
    return _.reduce(obj, function (res, val, key) {
        var newKey = _.snakeCase(key);
        if (recurse && _.isObject(val)) {
            res[newKey] = internals.keysToSnakeCase(val, recurse);
        } else {
            res[newKey] = val;
        }

        return res;
    }, {});
};

/**
 * helper function to convert object keys to camelCase
 * useful for converting column_names into object property names
 * @param  {object} obj the object to process
 * @return {object}     the processed object
 */
internals.keysToCamelCase = function (obj, recurse) {
    return _.reduce(obj, function (res, val, key) {
        var newKey = _.camelCase(key);
        if (recurse && _.isObject(val)) {
            res[newKey] = internals.keysToCamelCase(val, recurse);
        } else {
            res[newKey] = val;
        }

        return res;
    }, {});
};

/**
 * helper function to save changes in history tableName
 *
 */
internals.saveHist = function () {
    //TODO: implement
    console.log('Warning: Need to implement hist_table saving');
    return undefined;
};

module.exports = function getBaseModel(bookshelf) {
    var BaseModel = bookshelf.Model.extend({
        parse: internals.keysToCamelCase,
        format: internals.keysToSnakeCase,
        _utils: {
            keysToCamelCase: internals.keysToCamelCase,
            keysToSnakeCase: internals.keysToSnakeCase,
            formatQuery: _.partialRight(internals.keysToSnakeCase, true),
            saveHist: internals.saveHist
        },
        initialize: function initialize() {
            this.on('saved', this._utils.saveHist);
        }
    });
    internals.bookshelf = bookshelf;
    internals.BaseModel = BaseModel;
    return BaseModel;
};