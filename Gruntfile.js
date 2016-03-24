'use strict';
module.exports = function(grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);
    require('load-grunt-config')(grunt);

    // By default, lint and run all tests.
    grunt.registerTask('default', ['build']);
    grunt.registerTask('build-internal', ['clean', 'copy']);
    grunt.registerTask('build', ['exec:npm-run-build']);
};
