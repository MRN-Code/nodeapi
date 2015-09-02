'use strict';

const boom = require('boom');
const joi = require('joi');
const config = require('config'); // jshint ignore:line
const _ = require('lodash');
const consortiaDbOptions = config.get('coinstac.pouchdb.consortia');

const internals = {};

internals.consortiaSchema = joi.object().keys({
    label: joi.string().required(),
    users: joi.array().required(),
    description: joi.string().required(),
    tags: joi.array().required(),
    analyses: joi.array().required()
});

internals.savedConsortiaSchema = internals.consortiaSchema.keys({
    _id: joi.string().required(),
    _rev: joi.string().required()
});

internals.createConsortiaDb = (name, PouchW) => {
    const defaults = consortiaDbOptions;
    let pouchWConfig;

    //TODO: return name of db for ease of location
    name = defaults.name + '-' + _.kebabCase(name.toLowerCase());
    if (consortiaDbOptions.path) {
        pouchWConfig = {
            path: defaults.path,
            name: name
        };
    } else if (consortiaDbOptions.conn) {
        pouchWConfig = {
            name: name,
            conn: defaults.conn
        };
    }

    // create new db
    const newDb = new PouchW(pouchWConfig);
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
         * call createConsortiaDb with the _id of the consortia
         * @param  {object} consortia
         * @return {object}           the same as the input
         */
        const callCreateConsortiaDb = (consortia) => {
            const id = consortia._id;
            internals.createConsortiaDb(id, dbConstructor);
            return consortia;
        };

        db.add(request.payload)
            .then(fetchNewConsortia)
            .then(callCreateConsortiaDb)
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
