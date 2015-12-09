'use strict';

const controller = require('../../controllers/sites.js');

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/sites',
        method: 'GET',
        config: controller.get
    });
    next();
};

exports.register.attributes = {
    name: 'sites routes'
};
