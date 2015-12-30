'use strict';

module.exports = function(bookshelf) {
    return bookshelf.extend({
        tableName: 'mrs_series',
        idAttribute: 'series_id',
        seriesData: function() {
            return this.hasMany('SeriesData', 'series_id');
        }

    });
};
