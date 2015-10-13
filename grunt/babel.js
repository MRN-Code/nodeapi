'use strict';
module.exports = function() {
    return {
        options: {
            sourceMap: false
        },
        dist: {
            files: [
                {
                    expand: true,
                    cwd: 'src',
                    src: ['**/*.js'],
                    dest: 'dist',
                    ext: '.js'
                }
            ]
        }
    };
};
