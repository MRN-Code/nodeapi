'use strict';

const chai = require('chai');
const _ = require('lodash');
const relations = require('../stubs/relations.js');
const loadSchema = require('../../lib/permissions/load-schema.js');
const expect = chai.expect;

describe('loadSchema', () => {
    it ('should be a function', () => {
        expect(loadSchema).to.be.a('function');
    });

    it ('should load the supplied contexts', () => {
        const testSchema = {
            context1: {
                role1: ['GET', 'PUT', 'POST'],
                role2: ['GET', 'POST']
            },
            context2: {
                role1: ['GET', 'PUT'],
                role2: ['GET', 'PUT', 'POST']
            }
        };
        loadSchema(relations, testSchema);
        _.forEach(testSchema, (contextDef, contextName) => {
            expect(relations).to.have.property(contextName);
            expect(relations[contextName]()).to.eql(contextDef);
        });
    });
});
