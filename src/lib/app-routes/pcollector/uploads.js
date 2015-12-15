'use strict';

const controller = require('../../controllers/uploads.js');

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/uploads',
        method: 'GET',
        config: controller.get
    });
    next();
};

exports.register.attributes = {
    name: 'uploads routes'
};
