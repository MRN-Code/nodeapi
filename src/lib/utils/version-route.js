'use strict';
const path = require('path');
const pkg = require(path.join(process.cwd(), 'package.json'));

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/version',
        method: 'GET',
        config: {
            id: 'version',
            tags: ['api'],
            notes: ['Get current version of API', 'client:version'].join(' '),
            description: 'Returns current version of API.',
            auth: false,
            plugins: {
                'hapi-swagger': { nickname: 'get' }
            },
            handler: (request, reply) => {
                reply({ version: 'v' + pkg.version });
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'version route'
};
