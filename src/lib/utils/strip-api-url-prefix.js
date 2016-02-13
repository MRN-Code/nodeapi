'use strict';
const path = require('path');
const _ = require('lodash');
const url = require('url');
module.exports.register = function(server, options, next) {
    server.ext('onRequest', (request, reply) => {
        const newPath = request.url.pathname || request.url.path || request.url.href;
        if (newPath.indexOf('/api/v.') < 0) {
            return reply.continue();
        }

        let newUrl = _.clone(request.url);
        delete newUrl.path;
        delete newUrl.href;
        newUrl.pathname = newPath.replace(/\/api\/v\.[^\/]*/, '');
        request.setUrl(url.format(newUrl));
        reply.continue();
    });
    next();
};

exports.register.attributes = {
    name: 'strip-api-url-prefix',
};
