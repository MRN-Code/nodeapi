'use strict';

var path = require('path');
var yaml = require('yamljs');

module.exports = {
    register: require('swaggerize-hapi'),
    options: {
        api: yaml.load(path.join(__dirname, '..', '..', 'swagger', 'hello.yml')),
        handlers: path.join(__dirname, '..', 'handlers'),
    },
};
