'use strict';
import path from 'path';
const pkg = require(path.join(process.cwd(), 'package.json'));

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/version',
        method: 'GET',
        config: {
            tags: ['api'],
            notes: 'Get current version of API',
            description: 'Returns current version of API.',
            auth: false,
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
