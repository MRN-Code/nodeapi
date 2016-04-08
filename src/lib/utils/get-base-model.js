'use strict';
const _ = require('lodash');

const internals = {};

/**
 * helper function to convert object keys to snake case
 * useful for passing camelCase object names into bookshelf queries
 * @param  {object} obj the object to process
 * @return {object}     the processed object
 */
internals.keysToSnakeCase = (obj, recurse) => {
  return _.reduce(obj, (res, val, key) => {
    const newKey = _.snakeCase(key);
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
internals.keysToCamelCase = (obj, recurse) => {
  return _.reduce(obj, (res, val, key) => {
    const newKey = _.camelCase(key);
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
internals.saveHist = () => {
    // TODO: implement
  console.log('Warning: Need to implement hist_table saving');
  return this;
};

module.exports = function getBaseModel(bookshelf) {
  const BaseModel = bookshelf.Model.extend({
    parse: internals.keysToCamelCase,
    format: internals.keysToSnakeCase,
    _utils: {
      keysToCamelCase: internals.keysToCamelCase,
      keysToSnakeCase: internals.keysToSnakeCase,
      formatQuery: _.partialRight(internals.keysToSnakeCase, true),
      saveHist: internals.saveHist
    },
    initialize: function () {
      this.on('saved', this._utils.saveHist);
    }
  });
  internals.bookshelf = bookshelf;
  internals.BaseModel = BaseModel;
  return BaseModel;
};
