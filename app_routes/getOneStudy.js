'use strict';

exports.register = function(server, options, next) {
    var Study = require('../bookshelf_ORM/Study')(options.bookshelf);
    server.route({
        method: 'GET',
        path: '/study/{id}',
        config: {
            //auth: false,
            handler: function (request, reply) {
                new Study({ study_id: request.params.id }).fetch().then(function (study) {
                    reply(study);
                });
            /* Generator for future use.
                co(function *oneStudyGen() {
                    var study = yield new Study({ study_id: request.params.id }).fetch();
                    reply(study);
                });
            */
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'getOneStudy'
};
