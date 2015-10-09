'use strict';

var config = require('config');
var shield = require('bookshelf-shield');
var shieldConfig = config.get('shieldConfig');

function shieldsUp(server) {
    var models = {
        Study: server.plugins.bookshelf.model('Study'),
        Scan: server.plugins.bookshelf.model('Scan')
    };
    return shield({
        models: models,
        config: shieldConfig,
        acl: server.plugins.relations
    });
}

module.exports = shieldsUp;