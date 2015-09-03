'use strict';

const boom = require('boom');
const joi = require('joi');
const config = require('config'); // jshint ignore:line
const _ = require('lodash');
const consortiaDbOptions = config.get('coinstac.pouchdb.consortia');

const internals = {};

internals.consortiaDatabases = [];

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

internals.getConsortiaDb = (name, PouchW) => {
    const defaults = _.clone(consortiaDbOptions);
    let pouchWConfig;

    //TODO: return name of db for ease of location
    //TODO: do not mutate name here, it is done by pouchdb-wrapper anyway
    name = defaults.baseName + '-' + _.kebabCase(name.toLowerCase());
    if (_.find(internals.consortiaDatabases, { name: name })) {
        return _.find(internals.consortiaDatabases, { name: name });
    }

    if (consortiaDbOptions.conn) {
        defaults.conn.pathname = name;
    }

    pouchWConfig = {
        conn: defaults.conn, // conn always trumps path
        path: defaults.path,
        name: name
    };

    // create new db
    const newDb = new PouchW(pouchWConfig);

    // add consortiaDB to list of internal databases
    internals.consortiaDatabases.push({ name: name, db: newDb });
    return newDb;
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
        const db = request.server.plugins.houchdb.consortiaMeta;
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
        const db = request.server.plugins.houchdb.consortiaMeta;
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

        //TODO: return name of db for ease of location
        schema: internals.savedConsortiaSchema
    },
    auth: false, //TODO: add auth
    handler: (request, reply) => {
        const db = request.server.plugins.houchdb.consortiaMeta;
        const dbConstructor = request.server.plugins.houchdb.constructor;

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
        const callGetConsortiaDb = (consortia) => {
            const id = consortia._id;
            const newDb = internals.getConsortiaDb(id, dbConstructor);
            const dbUrl = newDb.url || newDb.path;
            consortia.dbUrl = dbUrl;
            return consortia;
        };

        db.save(request.payload)
            .then(fetchNewConsortia)
            .then(callGetConsortiaDb)
            .then(_.bind(db.update, db))
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
        const db = request.server.plugins.houchdb.consortiaMeta;

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
