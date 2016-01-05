'use strict';

const logger = {};

const getLogData = (err) => {
    let logData;
    if (err.stack) {
        logData = err.stack;
    } else if (err.message) {
        logData = err.message;
    } else if (err.toString instanceof Function) {
        logData = err.toString();
    } else {
        logData = err;
    }

    return logData;
};

module.exports.register = (server, options, next) => {

    //logs error
    logger.logError = (tags,err) => {
        server.log(['error'].concat(tags), getLogData(err));
    };

    //logs and throws error
    logger.logAndThrowError = (tags,err) => {
        server.log('[error]'.concat(tags), getLogData(err));
        throw err;
    };

    server.expose(logger);
    next();
};

module.exports.register.attributes = {
    name:'logUtil'
};
