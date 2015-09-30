'use strict';

/**
 * get the IP address from a request that might be proxied
 * @param  {object} request a hapi request object
 * @return {string}         the client IP address
 */
function getIpAddress(request) {
    const remoteAddress = request.info.remoteAddress;
    const forwardedFor = request.headers['x-forwarded-for'];

    // get left-most IP if forwardedFor is defined
    if (forwardedFor) {
        return forwardedFor.split(',').unshift().trim();
    }

    return remoteAddress;
}

module.exports.getIpAddress = getIpAddress;
