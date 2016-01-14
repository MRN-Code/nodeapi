'use strict';

module.exports = function() {
    return {
        main: {
            files: [
                {
                    expand: true,
                    cwd: 'src',
                    src: ['**/*.json', '**/*.yml'],
                    dest: 'dist'
                }
            ]
        }
    };
};
