'use strict';
const fs = require('fs');
const _ = require('lodash');

/**
 * Add all contexts to ACL
 * @param  {Relations} relations an intance of node relations
 * @param  {object} schema an object of contexts and there permissions
 * @return {Relations} the initialized relations object
 */
module.exports = function(relations, schema) {
    /**
     * defineContext define a context:
     * accepts params in the order supplied by forEach
     * @param  {object} contextDefinition an object containing roles and privs
     * @param  {string} contextName       is the name of the context
     * @return {null}                     nothing: the relations obj is mutated
     */
    function defineContext(contextDefinition, contextName) {
        return relations.define(contextName, contextDefinition);
    }

    _.forEach(schema, defineContext);
    return relations;
};
