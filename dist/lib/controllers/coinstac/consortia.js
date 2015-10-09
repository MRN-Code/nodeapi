'use strict';

var boom = require('boom');
var joi = require('joi');
var config = require('config'); // jshint ignore:line
var _ = require('lodash');
var Bluebird = require('bluebird');
var consortiaDbOptions = config.get('coinstac.pouchdb.consortia');
var cloudantClient = require('../../utils/cloudant-client.js');
var aggregateAnalysis = require('../../utils/aggregate-analysis.js');
var mockConsortia = require('../../mocks/mock-consortia.json');
var isCloudant = undefined;

if (config.has('coinstac.pouchdb.cloudant')) {
    isCloudant = true;
    cloudantClient.init();
}

var internals = {};

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
internals.addSeedData = function (db, server) {
    return db.all().then(function (docs) {
        var addPromises = undefined;
        if (docs.length === 0) {
            server.log(['info', 'coinstac'], 'Adding seed data to consortiameta DB');
            addPromises = _.map(mockConsortia, function (consortium) {
                return internals.getConsortiumDb(consortium._id, server).then(function (consortiumDb) {
                    var path = consortiumDb.url || consortiumDb.path;
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
 * @param  {object} db the pouchy instance
 * @return {Promise}    Resolves to the response from the cloudant API
 */
internals.setConsortiumDbSecurity = function (db) {
    var security = {
        nobody: ['_reader', '_writer']
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
internals.watchConsortiumDb = function (db, server) {
    var getAnalyses = function getAnalyses(docs) {
        return _.filter(docs, function (val) {
            return !val.aggregate;
        });
    };

    var getAggregate = function getAggregate(docs) {
        return _.find(docs, { aggregate: true }) || {};
    };

    var recalcAggregate = function recalcAggregate(docs) {
        var aggregate = getAggregate(docs);
        var analyses = getAnalyses(docs);
        aggregate.sampleSize = analyses.length;
        aggregate.error = null;
        aggregate.files = _.flatten(_.pluck(analyses, 'fileShas'));
        aggregate.contributors = _.pluck(analyses, 'username');
        aggregate.aggregate = true;
        if (analyses.length) {
            try {
                aggregate.data = aggregateAnalysis(analyses);
            } catch (err) {
                server.log(['error', 'aggregate-analysis', 'coinstac'], err.message);
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
    }).on('change', function (info) {
        server.log(['info', 'coinstac', 'aggregate-anlysis'], 'Change detected in consortiumDb `' + db.name + '`');
        if (!info.doc.aggregate) {
            server.log(['info', 'coinstac', 'aggregate-anlysis'], 'Recalculating aggreagate in consortiumDb `' + db.name + '`');
            db.all().then(recalcAggregate).then(_.bind(db.save, db))['catch'](function (err) {
                server.log(['error', 'aggregate-anlysis', 'coinstac'], err.message);
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
internals.getConsortiumDb = function (name, server) {
    var PouchW = server.plugins.houchdb.constructor;
    var pouchWConfig = _.clone(consortiaDbOptions);
    var existingDb = undefined;

    name = internals.dbBaseName + '-' + _.kebabCase(name.toLowerCase());

    existingDb = _.find(internals.consortiumDbClients, { name: name });

    //TODO: return name of db for ease of location
    //TODO: do not mutate name here, it is done by pouchdb-wrapper anyway
    if (existingDb) {
        return Bluebird.resolve(existingDb.db);
    }

    pouchWConfig.name = name;
    if (consortiaDbOptions.conn) {
        pouchWConfig.conn.pathname = '';
        if (pouchWConfig.basePathname) {
            pouchWConfig.conn.pathname = pouchWConfig.basePathname;
        }

        pouchWConfig.conn.pathname += '/' + name;
    }

    // create new db
    var newDb = new PouchW(pouchWConfig);

    // add consortiaDB to list of internal databases
    internals.consortiumDbClients.push({ name: name, db: newDb });
    return newDb.info().then(_.partial(internals.setConsortiumDbSecurity, newDb)).then(internals.watchConsortiumDb(newDb, server)).then(function () {
        return newDb;
    });
};

module.exports.getAll = {
    tags: ['api', 'coinstac', 'consortia'],
    notes: ['Returns all consortia stored in consortia DB', 'No query params supported currently'].join('<br>'),
    description: 'Returns array of all consortia',
    validate: {
        query: joi.object().keys({})
    },
    response: {
        schema: joi.array().items(internals.savedConsortiaSchema)
    },
    auth: false, //TODO: add auth
    handler: function handler(request, reply) {
        var db = request.server.plugins.houchdb.consortiameta;
        db.all().then(reply)['catch'](function (err) {
            request.log(['error', 'coinstac', 'consortia'], err.message, err);
            reply(boom.wrap(err));
        });
    }
};

module.exports.getOne = {
    tags: ['api', 'coinstac', 'consortia'],
    notes: ['Returns the consortia referenced by {id}'].join('<br>'),
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
    handler: function handler(request, reply) {
        var db = request.server.plugins.houchdb.consortiameta;
        var queryOptions = {};
        /* jscs:disable */
        queryOptions['include_docs'] = true; //jshint ignore:line
        /* jscs:enable */
        db.get(request.params.id, queryOptions).then(reply)['catch'](function (err) {
            request.log(['error', 'coinstac', 'consortia'], err.message, err);
            if (err.status === 404) {
                return reply(boom.wrap(err, 404));
            }

            reply(boom.wrap(err));
        });
    }
};

module.exports.post = {
    tags: ['api', 'coinstac', 'consortia'],
    notes: ['Creates a new consortia object and persists it to database'].join('<br>'),
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
    handler: function handler(request, reply) {
        var db = request.server.plugins.houchdb.consortiameta;

        /**
         * fetch a consortia using the _id of the document
         * @param  {object} doc consortia doc returned by add
         * @return {Promise}    resolves to `get` result
         */
        var fetchNewConsortia = function fetchNewConsortia(doc) {
            var queryOptions = {};
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
        var callGetConsortiumDb = function callGetConsortiumDb(consortium) {
            var id = consortium._id;
            return internals.getConsortiumDb(id, request.server).then(function (newDb) {
                var dbUrl = newDb.url || newDb.path;
                consortium.dbUrl = dbUrl;
                return consortium;
            });
        };

        db.save(request.payload).then(fetchNewConsortia).then(callGetConsortiumDb).then(_.bind(db.save, db)).then(reply)['catch'](function (err) {
            request.log(['error', 'coinstac', 'consortia'], err.message, err);
            reply(boom.wrap(err));
        });
    }
};

module.exports.put = {
    tags: ['api', 'coinstac', 'consortia'],
    notes: ['Updates a consortia object and persists it to database'].join('<br>'),
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
    handler: function handler(request, reply) {
        var db = request.server.plugins.houchdb.consortiameta;

        // Validate that the URL id matches the payload
        if (request.payload._id !== request.params.id) {
            var errorMsg = ['Illegal attempt to PUT consortium with id = `', request.payload._id, '` using URL with id = `', request.params.id, '`'].join('');
            reply(boom.badRequest(errorMsg));
            return;
        }

        db.update(request.payload).then(reply)['catch'](function (err) {
            request.log(['error', 'coinstac', 'consortia'], err.message, err);
            reply(boom.wrap(err));
        });
    }
};

module.exports.getConsortiumDb = internals.getConsortiumDb;
module.exports.addSeedData = internals.addSeedData;
module.exports.consortiumDbClients = internals.consortiumDbClients;