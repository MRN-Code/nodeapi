'use strict';

//const controller = require('../../controllers/users.js');

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/file',
        method: 'POST',
        config: {
            auth: false,
            handler: {
                proxy: {
                    host: 'localhost',
                    port: 7113,
                    protocol: 'http',
                    passThrough: true,
                    xforward: true
                }
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'file route'
};
