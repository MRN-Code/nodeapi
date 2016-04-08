'use strict';

module.exports = function (bookshelf) {
  return bookshelf.extend({
    tableName: 'mrs_scan_sessions',
    idAttribute: 'scan_id',
    series: function () {
      return this.hasMany('Series', 'scan_id');
    }
  });
};
