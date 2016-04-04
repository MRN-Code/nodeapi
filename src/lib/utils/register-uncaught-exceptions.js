'use strict';

// register error handler within server context s.t. server logger system has
// opporitunity to record the event prior to crashing
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
