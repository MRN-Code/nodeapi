'use strict';

module.exports = function(bookshelf) {
    return bookshelf.extend({
        tableName: 'cas_sites'
    });
};
