'use strict';

var pkg = require('../../package.json');

//export plugin registration function
exports.register = function (server, options, next) {
    server.route({
        path: '/version',
        method: 'GET',
        config: {
            tags: ['api'],
            notes: 'Get current version of API',
            description: 'Returns current version of API.',
            auth: false,
            handler: function handler(request, reply) {
                reply({ version: 'v' + pkg.version });
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'version route'
};