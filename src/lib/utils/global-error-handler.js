'use strict';

// uncaughtExceptions and unhandledRejections are re-routed here s.t. the server logger
// can record the incident before crashing
module.exports.register = (server, options, next) => {
    server.expose({
        handleUncaught: (err) => {
            server.log(
                ['error'],
                {
                    message: err ? err.toString() : '(empty Error)',
                    stack: err.stack
                }
            );
            process.nextTick(() => process.exit(1));
        }
    });
    next();
};

module.exports.register.attributes = {
    name:'globalErrorHandler'
};
