'use strict';
const Bluebird = require('bluebird');
const _ = require('lodash');

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
            let mockConsortia;
            if (docs.length === 0) {
                mockConsortia = require('../../mocks/mock-consortia');
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
        config: require('../../controllers/coinstac/consortia.js').getAll
    });

    server.route({
        method: 'GET',
        path: path + '/{id}',
        config: require('../../controllers/coinstac/consortia.js').getOne
    });

    server.route({
        method: 'POST',
        path: path,
        config: require('../../controllers/coinstac/consortia.js').create
    });

    addMockConsortia(db, next);

};

module.exports.register.attributes = {
    name: 'coinstac consoria routes'
};
