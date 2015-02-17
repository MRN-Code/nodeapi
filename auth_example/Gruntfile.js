/*
 * grunt-git
 * https://github.com/rubenv/grunt-git
 *
 * Copyright (c) 2013 Ruben Vermeersch
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        watch: {
            dev: {
                files: ['*.js', 'public/js/*.js'],
                tasks: ['jshint']
            }
        },
        jshint: {
            all: [
                'Gruntfile.js',
                '*.js',
                'public/js/app.js'
            ],
            options: {
                jshintrc: '.jshintrc',
            },
        },
        // Before generating any new files, remove any previously-created files.
        clean: {
            build: ['build']
        }
    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint']);

};
