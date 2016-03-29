'use strict';
const path = require('path');

//export plugin registration function
exports.register = (server, options, next) =>  {
    const clientDistPath = path.join(__dirname, '../../../dist/client/dist');
    server.route({
        path: '/client/{param*}',
        method: 'GET',
        config: {
            tags: ['client'],
            notes: 'Add filename (e.g. client.js)',
            description: 'Returns client source code',
            auth: false,
            plugins: { 'hapi-swagger': { nickname: 'get' } },
            handler: {
                directory: {
                    path: clientDistPath,
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
