'use strict';

var thenifyAll = require('thenify-all');
var relations = require('relations');
var _ = require('lodash');
var config = require('config');
var contexts = config.get('acl.contexts');
var roles = require('./roles.js');

module.exports.register = function(server, options, next) {
    //TODO: validate that server.plugins['hapi-redis'].client is set
    relations.use(relations.stores.redis, {
        client: server.plugins['hapi-redis'].client,
        prefix: 'COINS_PERM'
    });

    var contextNames = _.map(contexts, function getName(context) {
        return context.name;
    });
    _.each(contexts, function addContext(context) {
        relations.define(context.name);
    });

    _.each(roles, function addContextRoles(role) {
        var roleName = role.name + '_' + role.site;
        _.each(role.contexts, function addRoles(context) {
            var permissions = [];
            _.each(context.permissions, function(permission) {
                permissions.concat(_.map(
                    permission.actions,
                    function formatPermission(action) {
                        return action + '_' + permission.model;
                    }
                ));
            });
            relations[context.name].addRole(roleName, permissions);
        });
    });

    relations = thenifyAll(relations, relations, contextNames);

    server.plugins.acl = {};
    server.plugins.acl.getModel = function(name) {
        //TODO return bookshelf model with fetched, update and add events bound to the acl
    };
    server.plugins.acl.relations = relations;

    next();
};

module.exports.register.attributes = {
    name: 'acl'
};

