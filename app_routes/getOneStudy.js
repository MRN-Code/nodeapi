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
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'getOneStudy'
};
