'use strict';

exports.register = function(server, options, next) {
    var Study = server.plugins.bookshelf.Study;
    server.route({
        method: 'GET',
        path: '/study',
        config: {
            //auth: false,
            handler: function (request, reply) {
                new Study().fetchAll().then(function (studies) {
                    reply(studies);
                });
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'getAllStudies'
};
