module.exports = function(bookshelf) {
    return bookshelf.Model.extend({
        tableName: 'mrs_studies'
    });

//new Study({study_id: '6860'}).fetch().then(function(model) {
  //  console.log(model.get('label'));
//});
};
