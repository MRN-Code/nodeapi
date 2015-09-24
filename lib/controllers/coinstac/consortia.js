'use strict';

const boom = require('boom');
const joi = require('joi');
const config = require('config'); // jshint ignore:line
const _ = require('lodash');
const Bluebird = require('bluebird');
const consortiaDbOptions = config.get('coinstac.pouchdb.consortia');
const cloudantClient = require('../../utils/cloudant-client.js');
const aggregateAnalysis = require('../../utils/aggregate-analysis.js');
const mockConsortia = require('../../mocks/mock-consortia.json');
let isCloudant;

if (config.has('coinstac.pouchdb.cloudant')) {
    isCloudant = true;
    cloudantClient.init();
}

const internals = {};

internals.consortiumDbClients = [];

internals.dbBaseName = 'consortium';

internals.consortiaSchema = joi.object().keys({
    label: joi.string().required(),
    users: joi.array().required(),
    description: joi.string().required(),
    tags: joi.array().required(),
    analyses: joi.array().required()
});

internals.savedConsortiaSchema = internals.consortiaSchema.keys({
    dbUrl: joi.string().required(),
    _id: joi.string().required(),
    _rev: joi.string().required()
});

/**
 * Add seed consortia to DB if it is empty
 * @param  {object} db pouchDB instance
 * @return {Promise}    resolves when databases have been added, or immediately
 */
internals.addSeedData = (db, server) => {
    return db.all()
        .then((docs) => {
            let addPromises;
            if (docs.length === 0) {
                server.log(
                    ['info', 'coinstac'],
                    'Adding seed data to consortiameta DB'
                );
                addPromises = _.map(mockConsortia, (consortium) => {
                    return internals.getConsortiumDb(consortium._id, server)
                        .then((consortiumDb) => {
                            const path = consortiumDb.url || consortiumDb.path;
                            consortium.dbUrl = path;
                            return db.save(consortium);
                        });
                });

                return Bluebird.all(addPromises);
            } else {
                return Bluebird.resolve();
            }
        });
};

/**
 * Set the security on the consortiaDB to be more relaxed
 * Only takes action when config.coinstac.pouchdb.cloudant is defined
 * @param  {object} db the pouch-wrapper instance
 * @return {Promise}    Resolves to the response from the cloudant API
 */
internals.setConsortiumDbSecurity = (db) => {
    const security = {
        nobody: [
            '_reader',
            '_writer'
        ]
    };

    if (isCloudant) {
        return cloudantClient.mergeSecurity(db.name, security);
    } else {
        return Bluebird.resolve();
    }
};

/**
 * Add listeners to newly created consortiumDb
 * @param  {object} db     pouchDB or pouchWrapper insance
 * @param  {server} server server instance
 * @return {null}           nothing
 */
internals.watchConsortiumDb = (db, server) => {
    const getAnalyses = (docs) => {
        return _.filter(docs, (val) => {
            return !val.aggregate;
        });
    };

    const getAggregate = (docs) => {
        return _.find(docs, {aggregate: true}) || {};
    };

    const recalcAggregate = (docs) => {
        const aggregate = getAggregate(docs);
        const analyses = getAnalyses(docs);
        aggregate.sampleSize = analyses.length;
        aggregate.error = null;
        aggregate.files = _.flatten(_.pluck(analyses, 'fileShas'));
        aggregate.contributors = _.pluck(analyses, 'username');
        aggregate.aggregate = true;
        if (analyses.length) {
            try {
                aggregate.data = aggregateAnalysis(analyses);
            } catch (err) {
                server.log(
                    ['error', 'aggregate-analysis', 'coinstac'],
                    err.message
                );
                aggregate.error = err.message;
                aggregate.result = null;
            }
        }

        return aggregate;
    };

    db.changes({
        live: true,
        since: 'now',
        /*jscs:disable*/
        include_docs: true //jshint ignore:line
        /*jscs:enable*/
    }).on('change', (info) => {
        server.log(
            ['info', 'coinstac', 'aggregate-anlysis'],
            'Change detected in consortiumDb `' + db.name + '`'
        );
        if (!info.doc.aggregate) {
            server.log(
                ['info', 'coinstac', 'aggregate-anlysis'],
                'Recalculating aggreagate in consortiumDb `' + db.name + '`'
            );
            db.all()
                .then(recalcAggregate)
                .then(_.bind(db.save, db))
                .catch((err) => {
                    server.log(
                        ['error', 'aggregate-anlysis', 'coinstac'],
                        err.message
                    );
                });
        }
    });
};

/**
 * get a consortia PouchDB client from existing store or by creating one
 * also calls setConsortiaDbSecurity
 * @param  {string} name   the consortia id
 * @param  {object} server the hapi server instance
 * @return {Promise}        resolves to the newly created DB
 */
internals.getConsortiumDb = (name, server) => {
    const PouchW = server.plugins.houchdb.constructor;
    const pouchWConfig = _.clone(consortiaDbOptions);
    let existingDb;

    name = internals.dbBaseName + '-' + _.kebabCase(name.toLowerCase());

    existingDb = _.find(internals.consortiumDbClients, { name: name });

    //TODO: return name of db for ease of location
    //TODO: do not mutate name here, it is done by pouchdb-wrapper anyway
    if (existingDb) {
        return Bluebird.resolve(existingDb.db);
    }

    pouchWConfig.name = name;
    if (consortiaDbOptions.conn) {
        pouchWConfig.conn.pathname = name;
    }

    // create new db
    const newDb = new PouchW(pouchWConfig);

    // add consortiaDB to list of internal databases
    internals.consortiumDbClients.push({ name: name, db: newDb });
    return newDb.info()
        .then(_.partial(internals.setConsortiumDbSecurity, newDb))
        .then(internals.watchConsortiumDb(newDb, server))
        .then(() => {
            return newDb;
        });
};

module.exports.getAll = {
    tags: ['api', 'coinstac', 'consortia'],
    notes: [
        'Returns all consortia stored in consortia DB',
        'No query params supported currently'
    ].join('<br>'),
    description: 'Returns array of all consortia',
    validate: {
        query: joi.object().keys({})
    },
    response: {
        schema: joi.array().items(
            internals.savedConsortiaSchema
        )
    },
    auth: false, //TODO: add auth
    handler: (request, reply) => {
        const db = request.server.plugins.houchdb.consortiameta;
        db.all()
            .then(reply)
            .catch((err) => {
                request.log(
                    ['error', 'coinstac', 'consortia'],
                    err.message,
                    err
                );
                reply(boom.wrap(err));
            });
    }
};

module.exports.getOne = {
    tags: ['api', 'coinstac', 'consortia'],
    notes: [
        'Returns the consortia referenced by {id}'
    ].join('<br>'),
    description: 'Returns the referenced consortia',
    validate: {
        query: joi.object().keys({}),
        params: joi.object().keys({
            id: joi.string().required()
        })
    },
    auth: false, //TODO: add auth
    response: {
        schema: internals.savedConsortiaSchema
    },
    handler: (request, reply) => {
        const db = request.server.plugins.houchdb.consortiameta;
        const queryOptions = {};
        /* jscs:disable */
        queryOptions['include_docs'] = true; //jshint ignore:line
        /* jscs:enable */
        db.get(request.params.id, queryOptions)
            .then(reply)
            .catch((err) => {
                request.log(
                    ['error', 'coinstac', 'consortia'],
                    err.message,
                    err
                );
                if (err.status === 404) {
                    return reply(boom.wrap(err, 404));
                }

                reply(boom.wrap(err));
            });
    }
};

module.exports.post = {
    tags: ['api', 'coinstac', 'consortia'],
    notes: [
        'Creates a new consortia object and persists it to database'
    ].join('<br>'),
    description: 'Creates a new consortia object',
    validate: {
        query: joi.object().keys({}),
        params: joi.object().keys({}),
        payload: internals.consortiaSchema
    },
    response: {
        schema: internals.savedConsortiaSchema
    },
    auth: false, //TODO: add auth
    handler: (request, reply) => {
        const db = request.server.plugins.houchdb.consortiameta;

        /**
         * fetch a consortia using the _id of the document
         * @param  {object} doc consortia doc returned by add
         * @return {Promise}    resolves to `get` result
         */
        const fetchNewConsortia = (doc) => {
            const queryOptions = {};
            /* jscs:disable */
            queryOptions['include_docs'] = true; //jshint ignore:line
            /* jscs:enable */
            return db.get(doc._id, queryOptions);
        };

        /**
         * call getConsortiaDb with the _id of the consortia
         * @param  {object} consortia
         * @return {object} the same as the input, but with the db URL added
         */
        const callGetConsortiumDb = (consortium) => {
            const id = consortium._id;
            return internals.getConsortiumDb(id, request.server)
                .then((newDb) => {
                    const dbUrl = newDb.url || newDb.path;
                    consortium.dbUrl = dbUrl;
                    return consortium;
                });
        };

        db.save(request.payload)
            .then(fetchNewConsortia)
            .then(callGetConsortiumDb)
            .then(_.bind(db.save, db))
            .then(reply)
            .catch((err) => {
                request.log(
                    ['error', 'coinstac', 'consortia'],
                    err.message,
                    err
                );
                reply(boom.wrap(err));
            });
    }
};

module.exports.put = {
    tags: ['api', 'coinstac', 'consortia'],
    notes: [
        'Updates a consortia object and persists it to database'
    ].join('<br>'),
    description: 'Updates a consortia object',
    validate: {
        query: joi.object().keys({}),
        params: joi.object().keys({
            id: joi.string()
        }),
        payload: internals.savedConsortiaSchema
    },
    response: {
        schema: internals.savedConsortiaSchema
    },
    auth: false, //TODO: add auth
    handler: (request, reply) => {
        const db = request.server.plugins.houchdb.consortiameta;

        // Validate that the URL id matches the payload
        if (request.payload._id !== request.params.id) {
            const errorMsg = ['Illegal attempt to PUT consortium with id = `',
                request.payload._id,
                '` using URL with id = `',
                request.params.id,
                '`'
            ].join('');
            reply(boom.badRequest(errorMsg));
            return;
        }

        db.update(request.payload)
            .then(reply)
            .catch((err) => {
                request.log(
                    ['error', 'coinstac', 'consortia'],
                    err.message,
                    err
                );
                reply(boom.wrap(err));
            });
    }
};

module.exports.getConsortiumDb = internals.getConsortiumDb;
module.exports.addSeedData = internals.addSeedData;
module.exports.consortiumDbClients = internals.consortiumDbClients;
