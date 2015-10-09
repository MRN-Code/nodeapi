'use strict';

var controller = require('../../controllers/users.js');

//export plugin registration function
exports.register = function (server, options, next) {
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