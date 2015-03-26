'use strict';
var fs = require('fs');
var perm = JSON.parse(fs.readFileSync(__dirname + '/role_perm_template.json', 'utf8'));

module.exports = function(relations) {
    relations.define('micis', {});
    for (var role in perm) {
        if (role !== '_comment') {
            var canDos = [];
            for (var target in perm[role]) {
                perm[role][target].forEach(function(action) {
                     canDos.push((action + '_' + target).toUpperCase());
                });
            }
            relations.micis.addRole(role, canDos);
        }
    }
    return relations;
};
