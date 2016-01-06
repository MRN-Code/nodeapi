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
        const tags = ['possibly unhandled promise rejection'];
        server.plugins.logUtil.logError(tags, error);
    });

    next();
};

module.exports.register.attributes = {
    name: 'promise-uncaught-polyfill'
};
