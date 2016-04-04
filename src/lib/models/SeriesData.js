'use strict';

module.exports = function(bookshelf) {
    return bookshelf.extend({
      tableName: 'mrs_series_data',
      idAttribute: 'series_data_id'
  });
};
