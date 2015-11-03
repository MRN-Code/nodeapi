'use strict';
const boom = require('boom');
const joi = require('joi');
const config = require('config'); // jshint ignore:line
const _ = require('lodash');
const Bluebird = require('bluebird');
const consortiaDbOptions = config.get('coinstac.pouchdb.consortia');
const ConsortiumWatcher = require('../../utils/consortium-watcher.js');
const cloudantClient = require('../../utils/cloudant-client.js');
const aggregateAnalysis = require('../../utils/aggregate-analysis.js')
    .multiShot;
const mockConsortia = require('../../mocks/mock-consortia.json');
const lock = require('lock')();

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
                    return internals.getConsortiumDb({
                            name: consortium._id,
                            server
                        })
                        .then(internals.addInitialAggregate)
                        .then((consortiumDb) => {
                            const path = consortiumDb.url || consortiumDb.path;
                            consortium.dbUrl = path;
                            return db.save(consortium);
                        })
                        .catch((e) => {
                            console.log(e);
                        });
                });

                return Bluebird.all(addPromises);
            } else {
                return Bluebird.resolve();
            }
        });
};

/**
 * Add the initial aggregate document to the DB
 * @param  {pouchy} consortiumDb pouchy-wrapped pouchdb instance
 * @return {Promise}              Resolves to the same pouchdb instance
 */
internals.addInitialAggregate = (consortiumDb) => {
    const initialAggregate = {
        history: [],
        aggregate: true,
        data: {
            mVals: {
                'Left-Hippocampus': Math.random() //Wc
            },
            r2: 0,
            objective: Infinity, //F(Wc)
            gradient: { //dF(Wc-1)
                'Left-Hippocampus': 0
            },
            learningRate: 1e-8 //n
        },
        previousBestFit: {},
        lambda: 0.7,
        maxIterations: 200, //T
        contributors: [],
        clientCount: 2, //N
        files: [],
        iterate: true,
        error: null
    };
    initialAggregate.previousBestFit = _.cloneDeep(initialAggregate.data);
    return consortiumDb.save(initialAggregate)
        .then(() => { return consortiumDb; });
};

/**
 * Provided a list of consortium documents, including analysis results and
 * an aggregate, computes a new aggregrated result
 * @param {array} set of consortium-associated docs
 * @param {Hapi} server
 * @return {object} aggregrated result
 */
internals.recalcAggregate = (classifiedDocs, server) => {
    const aggregate = classifiedDocs.aggregate;
    const contributingAnalyses = classifiedDocs.contributingAnalyses;
    if (aggregate.clientCount > contributingAnalyses.length) {
        const errMsg = 'Attempt to recalculate aggregate without all analyses';
        return Bluebird.reject(new Error(errMsg));
    }

    aggregate.sampleSize = contributingAnalyses.length;
    aggregate.error = null;
    aggregate.files = _.flatten(_.pluck(contributingAnalyses, 'fileShas'));
    try {
        aggregateAnalysis(contributingAnalyses, aggregate); //mutates aggregate
    } catch (err) {
        server.log(
            ['error', 'aggregate-analysis', 'coinstac'],
            err.message
        );
        aggregate.error = err.message;
        aggregate.result = null;
    }

    return aggregate;
};

/**
* Set the security on the consortiaDB to be more relaxed
* Only takes action when config.coinstac.pouchdb.cloudant is defined
* @param  {object} db the pouchy instance
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

internals.getAnalyses = (docs) => {
    return _.filter(docs, (val) => {
        return !val.aggregate;
    });
};

internals.getAggregate = (docs) => {
    return _.find(docs, {aggregate: true}) || {};
};

/**
 * Update the contributors list for the current iteration
 * @param  {object} classifiedDocs an object with `aggregate`, `analyses`,
 *                                 and `contributingAnalyses` properties
 * @param  {pouchy} db             the consortiumDb in which to save the updated
 *                                 aggregate
 * @return {object}                the classifiedDocs object with the aggregate
 *                                     updated
 */
internals.updateAggregateContributors = (classifiedDocs) => {
    const aggregate = classifiedDocs.aggregate;
    const contributingAnalyses = classifiedDocs.contributingAnalyses;
    const prevContributors = aggregate.conctributors;
    const contributors = _.pluck(contributingAnalyses, 'username');
    const contributorDiff = _.difference(prevContributors, contributors)
        .concat(_.difference(contributors, prevContributors));
    if (contributorDiff.length === 0) {
        aggregate.unchanged = true;
    } else {
        aggregate.contributors = contributors;
    }

    return aggregate;
};

/**
 * get all analyses that have contributed to the current iteration
 * @param  {array} docs array of documents from consortiumDB
 * @return {array} array of analysis documents
 */
internals.getContributingAnalyses = (analyses, aggregate) => {
    const currentIteration = aggregate.history.length + 1;

    return _.filter(analyses, (analysis) => {
        return analysis.history.length === currentIteration;
    });
};

/**
 * Split docs into their categories: aggregate, analyses and
 * contributingAnalyses
 * @param  {array} docs an array of documents
 * @return {object}      an object of the following form:
 *                          {
 *                          aggregate {object}: the aggregate object,
 *                          analyses {array}: all the analysis objects,
 *                          contributingAnalyses {array}: all analyses that have
 *                          	data for the current iteration
 *                          }
 */
internals.classifyDocs = (docs) => {
    const analyses = internals.getAnalyses(docs);
    const aggregate = internals.getAggregate(docs);
    const contributingAnalyses = internals.getContributingAnalyses(
        analyses,
        aggregate
    );
    return {
        aggregate: aggregate,
        analyses: analyses,
        contributingAnalyses: contributingAnalyses
    };
};

/**
* Add listeners to newly created consortiumDb
* @param  {object} db     pouchDB or pouchWrapper insance
* @param  {server} server server instance
* @param  {function} cb
* @return {null}           nothing
*/
internals.watchConsortiumDb = (db, server) => {
    const dbWatcher = new ConsortiumWatcher(db);
    const log = (message) => {
        return server.log(['info', 'coinstac', 'ConsortiumWatcher'], message);
    };

    dbWatcher.on('changed', () => {
        log('change detected in consortiumDb: ' + db.name);
    });

    dbWatcher.on('changed:analysis', (analysis) => {
        log('analysis updated in consortiumDb: ' + db.name);
        const saveNewAggregate = (newAggregate) => {
            if (newAggregate.unchanged) {
                const msg = [
                    'contributors list unchanged after processing new analysis',
                    'contributors: ',
                    newAggregate.contributors.join(','),
                    'new analysis ID: ',
                    analysis._id
                ].join(' ');
                log(msg);
                return;
            } else {
                return db.save(newAggregate);
            }
        };

        lock(db.name, (releaseLock) => {
            return db.all()
                .then(internals.classifyDocs)
                .then(internals.updateAggregateContributors)
                .then(saveNewAggregate)
                .catch((err) => {
                    server.log(
                        ['error', 'coinstac', 'handleAnalysisChange'],
                        err.stack
                    );
                })
                .then(releaseLock());
        });
    });

    dbWatcher.on('changed:aggregate', () => {
        log('aggregate updated in consortiumDb: ' + db.name);
    });

    dbWatcher.on('error', (err) => {
        server.log(
            ['error', 'coinstac', 'consortiumWatcher'],
            err.message
        );
    });

    dbWatcher.on('allAnalysesSubmitted', (aggregate) => {
        const logMessage = [
            'processing analyses for iteration',
            aggregate.history.length,
            'in consortiumDb:',
            db.name
        ];
        log(logMessage);

        lock(db.name, (releaseLock) => {
            db.all()
                .then(internals.classifyDocs)
                .then(_.partialRight(internals.recalcAggregate, server))
                .then(_.bind(db.save, db))
                .catch((err) => {
                    server.plugins.logUtil.logger.logError(
                        ['coinstac', 'handleAllAnalysesSubmitted'],
                        err
                      );
                })
                .then(releaseLock());
        });
    });

    return dbWatcher;
};

/**
* get a consortia PouchDB client from existing store or by creating one
* also calls setConsortiaDbSecurity
* @param {object} opts
* @param {string} opts.name   the consortia id
* @param {object} opts.server the hapi server instance
* @return {Promise}        resolves to the newly created DB
*/
internals.getConsortiumDb = (opts) => {
    let { name, server } = opts;
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
        pouchWConfig.conn.pathname = '';
        if (pouchWConfig.basePathname) {
            pouchWConfig.conn.pathname = pouchWConfig.basePathname;
        }

        pouchWConfig.conn.pathname += '/' + name;
    }

    // create new db
    const newDb = new PouchW(pouchWConfig);
    const saveInConsortiumDbClients = (dbWatcher) => {
        internals.consortiumDbClients.push({
            name: name,
            db: newDb,
            watcher: dbWatcher
        });
    };

    // add consortiaDB to list of internal databases
    return newDb.info()
    .then(_.partial(internals.setConsortiumDbSecurity, newDb))
    .then(_.noop)
    .then(_.partial(internals.watchConsortiumDb, newDb, server))
    .then(saveInConsortiumDbClients)
    .then(_.noop)
    .then(_.partial(_.identity, newDb))
    .catch((err) => {
        server.log(
            ['error', 'coinstac', 'getConsortiumDb'],
            err.message
        );
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
        * call getConsortiumDb with the _id of the consortia
        * @param  {object} consortia
        * @return {object} the same as the input, but with the db URL added
        */
        const callGetConsortiumDb = (consortium) => {
            const id = consortium._id;
            return internals.getConsortiumDb({
                name: id,
                server: request.server
            })
            .then(internals.addInitialAggregate)
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
module.exports.docChanges = internals.docChanges;
module.exports.consortiumDbClients = internals.consortiumDbClients;
