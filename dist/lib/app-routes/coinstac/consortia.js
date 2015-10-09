'use strict';
var Bluebird = require('bluebird');
var _ = require('lodash');
var controller = require('../../controllers/coinstac/consortia.js');

var assertIndexes = function assertIndexes(db) {
    return db.createIndex({
        index: {
            fields: ['sha']
        }
    }); // ToDo handle error condition
};

/**
 * Create PouchDB clients for existing consortia
 * @param  {PouchClient} db     consortiaMeta database client
 * @param  {HapiServer} server  the Hapi Server object
 * @return {Promise}            resolves when all consortiumDbs have
 *                                       been loaded and are being watched
 */
var loadConsortiaDbs = function loadConsortiaDbs(db, server) {
    return db.all().then(function (docs) {
        var dbPromises = _.map(docs, function (consortium) {
            var id = consortium._id;
            return controller.getConsortiumDb(id, server);
        });

        if (dbPromises.length) {
            return Bluebird.all(dbPromises);
        } else {
            return Bluebird.resolve();
        }
    });
};

exports.register = function (server, options, next) {
    var path = '/consortia';

    var db = server.plugins.houchdb.consortiameta;

    assertIndexes(db);

    server.route({
        method: 'GET',
        path: path,
        config: controller.getAll
    });

    server.route({
        method: 'GET',
        path: path + '/{id}',
        config: controller.getOne
    });

    server.route({
        method: 'POST',
        path: path,
        config: controller.post
    });

    server.route({
        method: 'PUT',
        path: path + '/{id}',
        config: controller.put
    });

    controller.addSeedData(db, server).then(_.partial(loadConsortiaDbs, db, server)).then(_.noop).then(next)['catch'](next);
};

module.exports.register.attributes = {
    name: 'coinstac consoria routes'
};