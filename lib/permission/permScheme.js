'use strict';
var fs = require('fs');
var perm = JSON.parse(fs.readFileSync(__dirname + '/role_perm_template.json', 'utf8'));

module.exports = function(relations) {
    relations.define('micis', {});
    for (var role in perm) {
        if (perm.hasOwnProperty(role) && role !== '_comment') {
            var canDos = [];
            /*jshint loopfunc: true */
            for (var target in perm[role]) {
                if (perm[role].hasOwnProperty(target)) {
                    perm[role][target].forEach(function(action) {
                        canDos.push((action + '_' + target).toUpperCase());
                    });
                }
            }
            relations.micis.addRole(role, canDos);
        }
    }
    return relations;
};
