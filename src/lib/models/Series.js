'use strict';

module.exports = function(bookshelf) {
    return bookshelf.extend({
        tableName: 'mrs_series',
        seriesData: function() {
            return this.hasMany('SeriesData');
        }
    });
};
