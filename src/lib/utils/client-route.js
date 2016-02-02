'use strict';
const path = require('path');

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/client/{param*}',
        method: 'GET',
        config: {
            tags: ['api'],
            notes: 'Add filename (e.g. client.js)',
            description: 'Returns client source code',
            auth: false,
            plugins: {
                'hapi-swagger': { nickname: 'get' }
            },
            handler: {
                directory: {
                    path: path.join(process.cwd(), 'dist', 'client', 'dist'),
                    listing: true
                }
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'client-source'
};
