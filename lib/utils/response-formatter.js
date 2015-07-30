'use strict';

const _ = require('lodash');
const defaultOptions = {
    excludePaths: [], //paths to be excluded from formatting
    excludeVarieties: [], //e.g. 'view', 'file', 'stream',
    excludePlugins: [] //exclude routes registered by specific plugins
};

module.exports.register = function(server, options, next) {
    _.defaults(options, defaultOptions);
    server.ext('onPostHandler', (request, reply) => {
        const resObj = {
            data: [],
            error: null,
            stats: {}
        };
        let rawRes = request.response;

        if (_.includes(options.excludeVarieties, request.response.variety) ||
            _.includes(options.excludePaths, request.path) ||
            _.includes(options.excludePlugins, request.route.realm.plugin)) {
            return reply.continue();
        }

        if (rawRes.source) {
            rawRes = rawRes.source;
        }

        let code = rawRes.statusCode || 200;
        let headers = {};
        let response;

        if (_.isError(rawRes)) {
            resObj.error = {};
            if (rawRes.isBoom) {
                code = rawRes.output.statusCode;
                headers = rawRes.output.headers;
                resObj.error = rawRes.output.payload;
                resObj.error.debugData = rawRes.data;
            } else {
                code = 500;
                resObj.error = {
                    statusCode: 500,
                    message: rawRes.toString(),
                    error: 'Internal Server Error'
                };
            }
        } else if (_.isArray(rawRes)) {
            resObj.data = rawRes;
        } else {
            resObj.data.push(rawRes);
        }

        response = reply(resObj).code(code);
        _.forEach(headers, (val, key) => {
            response.header(key, val);
        });
    });

    next();
};

module.exports.register.attributes = {
    name: 'response-formatter'
};
