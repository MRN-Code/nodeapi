'use strict';
const Bluebird = require('bluebird');
Bluebird.longStackTraces();

module.exports.register = (server, options, next) => {
    /**
     * @package promise-uncaught-polyfill
     * This package is used in both the rendering AND main process to detect
     * uncaught promises
     * @param  {error}
     * @return {undefined}
     */
    Bluebird.onPossiblyUnhandledRejection(function(error) {
        error = error || {};
        const msg = error.message || 'unhandled promise rejection occurred :/';
        const tags = ['error', 'possibly unhandled promise rejection'];
        server.log(tags, msg);
        tags.push('stacktrace');
        server.log(tags, error.stack);
    });

    next();
};

module.exports.register.attributes = {
    name: 'promise-uncaught-polyfill'
};
