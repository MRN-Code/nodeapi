var config = require('config');
var url = require('url');
var opts = require("nomnom")
   .option('deleteDatabases', {
      abbr: 'dd',
      flag: true,
      help: 'delete all databases, -sys level dbs'
   })
   .option('version', {
      flag: true,
      help: 'print version and exit',
      callback: function() {
         return "version 0.0.1";
      }
   })
   .parse();

var couchurl = url.format({
    protocol: config.pouchdb.consortia.protocol,
    hostname: config.pouchdb.consortia.hostname,
    port: config.pouchdb.consortia.port
});

if (opts.deleteDatabases) {
    var axios = require('axios');
    axios.get(url.resolve(couchurl, '_all_dbs'))
    .then(function(resp) {
        var allDeleted = resp.data.map(function deleteDb(dbname) {
            return axios.delete(url.resolve(couchurl, dbname));
        });
        return Promise.all(allDeleted);
    })
    .then(function(allDeletedMeta) {
        console.log(allDeletedMeta.length, 'dbs deleted');
    })
    .catch(function(err) {
        console.error(err.message || 'fatal delete dbs error');
        console.dir(err.stack);
    });
}