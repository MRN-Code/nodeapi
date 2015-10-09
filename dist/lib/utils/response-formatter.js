'use strict';

var _ = require('lodash');
var defaultOptions = {
    excludePaths: [], //paths to be excluded from formatting
    excludeVarieties: [], //e.g. 'view', 'file', 'stream',
    excludePlugins: [] //exclude routes registered by specific plugins
};

module.exports.register = function (server, options, next) {
    _.defaults(options, defaultOptions);
    server.ext('onPreResponse', function (request, reply) {
        var resObj = {
            data: [],
            error: null,
            stats: {}
        };
        var rawRes = request.response;

        if (_.includes(options.excludeVarieties, request.response.variety) || _.includes(options.excludePaths, request.path) || _.includes(options.excludePlugins, request.route.realm.plugin)) {
            return reply['continue']();
        }

        if (rawRes.source) {
            rawRes = rawRes.source;
        }

        var code = rawRes.statusCode || 200;
        var headers = {};
        var response = undefined;

        if (rawRes.isBoom) {
            resObj.error = {};
            request.log(['error'], rawRes.message);
            code = rawRes.output.statusCode;
            headers = rawRes.output.headers;
            resObj.error = rawRes.output.payload;
            resObj.error.debugData = rawRes.data;
        } else if (_.isArray(rawRes)) {
            resObj.data = rawRes;
        } else {
            resObj.data.push(rawRes);
        }

        response = reply(resObj).code(code);
        _.forEach(headers, function (val, key) {
            response.header(key, val);
        });
    });

    next();
};

module.exports.register.attributes = {
    name: 'response-formatter'
};