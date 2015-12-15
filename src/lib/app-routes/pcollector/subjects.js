'use strict';

const controller = require('../../controllers/subjects.js');

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/subjects',
        method: 'GET',
        config: controller.get
    });
    next();
};

exports.register.attributes = {
    name: 'subjects routes'
};
