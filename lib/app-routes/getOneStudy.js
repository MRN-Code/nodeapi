'use strict';
var boom = require('boom');

exports.register = function(server, options, next) {
    var Study = server.plugins.bookshelf.model('Study');
    server.route({
        method: 'GET',
        path: '/study/{id}',
        config: {
            //auth: false,
            handler: function (request, reply) {
                var username = request.auth.credentials.username;
                console.log('received request for study_id ' + request.params.id);
                console.log('from user ' + username);
                new Study({ study_id: request.params.id })
                    .read({username: username})
                    .then(function (study) {
                        reply(study);
                    })
                    .catch(function(err) {
                        console.log('error reading study');
                        console.log(err.toString());
                        reply(boom.wrap(err));
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
