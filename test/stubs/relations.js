'use strict';
const relations = { };

relations.define = function(name, definition) {
    relations[name] = () => { return definition; };

    return relations;
};

module.exports = relations;
