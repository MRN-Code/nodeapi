'use strict';
const Bluebird = require('bluebird');
const _ = require('lodash');
const mockConsortia = require('../../mocks/mock-consortia.json');
const controller = require('../../controllers/coinstac/consortia.js');

const assertIndexes = (db) => {
    return db.createIndex({
        index: {
            fields: ['sha']
        }
    }); // ToDo handle error condition
};

const addMockConsortia = (db, next) => {
    db.all()
        .then((docs) => {
            let addPromises;
            if (docs.length === 0) {
                addPromises = _.map(mockConsortia, (consortium) => {
                    return db.add(consortium);
                });

                Bluebird.all(addPromises).then(_.noop).then(next).catch(next);
            } else {
                next();
            }
        });
};

exports.register = (server, options, next) => {
    const path = '/consortia';

    const db = server.plugins.houchdb.consortiaMeta;
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

    addMockConsortia(db, next);

};

module.exports.register.attributes = {
    name: 'coinstac consoria routes'
};
