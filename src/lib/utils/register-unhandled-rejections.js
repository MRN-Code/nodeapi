'use strict';
const Bluebird = require('bluebird');
Bluebird.longStackTraces();
module.exports.register = (server, options, next) => {
    process.on(
        'unhandledRejection',
        server.plugins.globalErrorHandler.handleUncaught
    );
    next();
};
module.exports.register.attributes = {
    name:'registerUnhandledRejection'
};
