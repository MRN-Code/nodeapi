'use strict';

const controller = require('../../controllers/studies.js');

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/studies',
        method: 'GET',
        config: controller.get
    });
    next();
};

exports.register.attributes = {
    name: 'studies routes'
};
