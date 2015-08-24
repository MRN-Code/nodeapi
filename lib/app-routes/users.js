'use strict';

// require 3rd party packages
const boom = require('boom');
const joi = require('joi');

const controller = require('../controllers/users.js');

//export plugin registration function
exports.register = (server, options, next) =>  {
    server.route({
        config: conrtroller.search
    });
    next();
};

exports.register.attributes = {
    //TODO: update name
    name: 'example route'
};
