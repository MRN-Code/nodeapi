'use strict';

const controller = require('../../controllers/file-records.js');

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        path: '/filerecords',
        method: 'POST',
        config: controller.post
    });
    next();
};

exports.register.attributes = {
    name: 'filerecords route'
};
