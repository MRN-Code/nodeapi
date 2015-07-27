'use strict';

const boom = require('boom');

exports.register = function(server, options, next) {
    const path = '/scans';
    const Scans = server.plugins.bookshelf.model('scans');
    const relations = server.plugins.hapiRelations;

    server.route({
        method: 'GET',
        path: path,
        handler: (request, reply) => {
            const user = request.auth.credentials.username;
            relations.study('What can %s read_Scan from?', user, (err, studies) => {
                new Scans()
                    .whereIn('study_id', studies)
                    .readAll({username: user})
                    .then(function (studyCollection) {
                        reply(studyCollection);
                    }).catch((err) => {
                        reply(boom.wrap(err));
                    });
            });
        }
    });

    server.route({
        method: 'GET',
        path: path + '/{id}',
        handler: (request, reply) => {
            const user = request.auth.credentials.username;
            new Scan({study_id: request.params.id})
                .read({username: user})
                .then(function (study) {
                    reply(study);
                }).catch((err) => {
                    reply(boom.wrap(err));
                });
        }
    });

    server.route({
        method: 'POST',
        path: path,
        handler: (request, reply) => {
            new Scan.forge(request.params).save()
                .then(() => {
                    reply('saved')
                }).catch((err) => {
                    reply(boom.wrap(err));
                });
        }
    });

    next();
};

exports.register.attributes = {
    name: 'scans'
};
