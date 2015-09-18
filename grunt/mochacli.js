'use strict';
module.exports = function() {
    return {
        options: {
            files: ['test/integration/*.js', 'test/unit/*.js'],
            require: ['test/utils/mock-coinstac-pouch-config.js'],
            harmony: true,
            /* jscs:disable */
            harmony_arrow_functions: true //jshint ignore:line
            /* jscs:enable */
        },
        spec: {
            options: {
                reporter: 'spec',
                timeout: 20000
            }
        }
    };
};
