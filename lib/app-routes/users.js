'use strict';

const controller = require('../controllers/users.js');

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/users',
        method: 'POST',
        config: controller.post
    });
    next();
};

exports.register.attributes = {
    name: 'users routes'
};
