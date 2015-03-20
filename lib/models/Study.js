'use strict';

module.exports = function(bookshelf) {
    return bookshelf.Model.extend({
        tableName: 'mrs_studies'
    });
};
