'use strict';

module.exports = function (bookshelf) {
  return bookshelf.extend({
    tableName: 'cas_login_records',
    idAttribute: 'id'
  });
};
