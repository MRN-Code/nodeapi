'use strict';
module.exports.register = (server, options, next) => {
    process.on(
        'uncaughtException',
        server.plugins.globalErrorHandler.handleUncaught
    );
    next();
};
module.exports.register.attributes = {
    name:'registerUncaughtException'
};
