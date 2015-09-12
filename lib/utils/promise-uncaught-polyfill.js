'use strict';
const Bluebird = require('bluebird');
Bluebird.longStackTraces();

/**
 * @package promise-uncaught-polyfill
 * This package is used in both the rendering AND main process to detect
 * uncaught promises
 * @param  {error}
 * @return {undefined}
 */
Bluebird.onPossiblyUnhandledRejection(function(error) {
    error = error || {};
    var msg = error.message || 'unhandled error occurred :/';
    console.error(error.message, 'trace:');
    console.dir(error.stack);
    throw error;
});
