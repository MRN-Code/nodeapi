'use strict';

module.exports = function (bookshelf) {
    return bookshelf.extend({
        tableName: 'mrs_scan_sessions'
    });
};