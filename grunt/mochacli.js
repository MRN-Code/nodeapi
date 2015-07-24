'use strict';
module.exports = function(grunt) {
    return {
        options: {
            files: 'test/*_test.js',
            harmony: true,
            harmony_arrow_functions: true
        },
        spec: {
            options: {
                reporter: 'spec',
                timeout: 10000
            }
        }
    };
};
