'use strict';
var Bluebird = require('bluebird');
Bluebird.longStackTraces();

module.exports.register = function (server, options, next) {
    /**
     * @package promise-uncaught-polyfill
     * This package is used in both the rendering AND main process to detect
     * uncaught promises
     * @param  {error}
     * @return {undefined}
     */
    Bluebird.onPossiblyUnhandledRejection(function (error) {
        error = error || {};
        var msg = error.message || 'unhandled promise rejection occurred :/';
        var tags = ['error', 'possibly unhandled promise rejection'];
        server.log(tags, msg);
        tags.push('stacktrace');
        server.log(tags, error.stack);
    });

    next();
};

module.exports.register.attributes = {
    name: 'promise-uncaught-polyfill'
};