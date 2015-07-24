'use strict';

var fs = require('fs');
var hapi = require('hapi');
var basic = require('hapi-auth-basic');
var hawk = require('hapi-auth-hawk');
var good = require('good');
var boom = require('boom');
var config = require('config');
var redis = require('redis');
var client = redis.createClient(config.get('redis').port, config.get('redis').host);
var babel = require('babel/register');
var glob = require('glob');

var dbmap = require(config.get('dbMapPath'));
var dbconfig;
if (process.env.NODE_ENV === 'production') {
    dbconfig =  dbmap.prd.node_api;
} else if(process.env.NODE_ENV === 'development') {
    dbconfig =  dbmap.dev.node_api;
} else if(process.env.NODE_ENV === 'staging') {
    dbconfig =  dbmap.training.node_api;
} else {
    throw new Error ('unrecognised database environment: `' + process.env.NODE_ENV + '`');
}

var knexConfig = {
    debug: true,
    client: 'pg',
    connection: {
        host: dbconfig.host,
        port: 5432,
        user: dbconfig.username,
        password: dbconfig.password,
        database: dbconfig.db
    },
    pool: {
        min: 1,
        max: 10
    }
};
var goodOptions = {
    reporters: [{
        reporter: require('good-console'),
        events:{ log: '*', response: '*' }
    }, {
        reporter: require('good-file'),
        events:{ log: '*', response: '*' },
        config: { path: config.get('logPath'), prefix: 'node', rotate: 'daily' }
    }]
};

// Set up DB
//var userDB = { john: config.defaultUser };

client.on('error', function() {
    console.log('Failed to connect to redis server.');
}).on('connect', function() {
    console.log('Connected to redis server successfully.');
});

// Set up Server
var server = new hapi.Server();
var httpsOptions = {
    labels: ['https'],
    port: config.get('httpsPort')
};
var httpOption = {
    labels: ['http'],
    port: config.get('httpPort')
};
if (config.has('sslCertPath')) {
    httpsOptions.tls = require('./lib/utils/sslCredentials.js');
}
var https = server.connection(httpsOptions);
var http = server.connection(httpOption);

// load mcrypt auth key
server.app.authKey = fs.readFileSync(config.get('dbEncryptionKeyPath')).toString().trim();

process.stderr.on('data', function(data) {
    console.log(data);
});

// Helper functions
/**
 * get stored hawk credentials from db
 * @param {string} id - the id (public key)
 * @param {function} callbck - callback with signature:
 *   `function(error, credentials){ ... }`
 */
var getHawkCredentials = function(id, callback) {
    client.hgetall(id, function(err, credentials) {
        if (!credentials) {
            callback(null, false);
        } else {
            callback(null, credentials);
        }
    });
};

/**
 * Generate a plugin array, including all route plugins under lib/app_routes
 * @return {array}
 */
var setPlugins = function () {
    var plugins = [
        basic,
        hawk,
        {
            register: good,
            options: goodOptions
        },
        {
            register: require('hapi-bookshelf-models'),
            options: {
                knex: knexConfig,
                plugins: ['registry'],
                models: './lib/models/',
            }
        }
    ];

    // add route plugins
    var newRoute;
    glob.sync('./lib/app_routes/*.js').forEach (function (file) {
        newRoute = {
            register: require(file),
            options: {
                redisClient: client,
                relations: server.plugins.hapiRelations
            }
        };
        plugins.push(newRoute);
    });
    return plugins;
};

/**
 * Check user permission on subject operation
 * @param {object} request - request object sent from browser
 * @param {function} callback - callback function with signature (object)
 * return
 */
var checkSubjectPermission = function (request, callback) {
    var allowed = true;
    var method = request.method.toUpperCase();
    var study_id = request.url.path.split('/')[2];
    var username = 'gr6jwhvO3hIrWRhK0LTfXA=='; //request.auth.credentials.username;
    server.plugins.hapiRelations.coins('Can %s %s from %s', username, method + '_SUBJECT', study_id,
        function (err, can) {
            if (!can) {
                allowed = false;
            }
            return callback({ allowed: allowed });
        }
    );
};

/**
 * Check user permission on request
 * @param {object} request - request object sent from browser
 * @param {function} callback - callback function with signature (object)
 * return
 */
/*
var checkPermission = function (request, callback) {
    var url = request.url.path.toLowerCase();
    if (url.indexOf('/study/') === 0) {
        var method = request.method.toUpperCase();
        var temp = url.split('/');
        var study_id = temp[2];
        var username = 'gr6jwhvO3hIrWRhK0LTfXA=='; //request.auth.credentials.username;
        // Doing permission check
        server.plugins.hapiRelations.coins('Can %s %s from %s', username, method + '_STUDY', study_id,
            function (err, can) {
                if (!can) {
                    //console.log('not allowed');
                    return callback({ allowed: false });
                } else if (temp.indexOf('subject') > 0) {
                    checkSubjectPermission(request, callback);
                } else {
                    return callback({ allowed: true });
                }
            }
        );
    } else {
        return callback({ allowed: true });
    }
};

server.ext('onPostAuth', function(request, reply) {
    var result = function (obj) {
        if (!obj.allowed) {
            return reply(boom.unauthorized('Insufficient Privileges'));
        } else {
            return reply.continue();
        }
    };
    checkPermission(request, result);
});
*/

server.register(
    setPlugins(),
    function pluginError(err) {
        if (err) {
            console.log('Failed loading plugin: ' + err);
        }
        https.auth.strategy('default', 'hawk', { getCredentialsFunc: getHawkCredentials });
        https.auth.default('default');

        // Mock relations plugin
        server.plugins.relations = require('relations');
        var relationsSchema = require(config.get('permissionsSchemaPath'));
        require('./lib/permissions/load-schema.js')(server.plugins.relations, relationsSchema);
        server.plugins.relations.study('mochatest is PI of 7720');

        // Wrap models with Shield
        var shield = require('bookshelf-shield');
        var shieldConfig = config.get('shieldConfig');
        var models = {
            Study: server.plugins.bookshelf.model('Study')
        }
        shield({
            models: models,
            config: shieldConfig,
            acl: server.plugins.relations
        });

        http.route({
            method: '*',
            path: '/{path*}',
            handler: function(request, reply) {
                //reply('Please use https instead of http.');
                reply.redirect('https://' + request.info.hostname + ':' + config.httpsPort + request.url.path);
            }
        });

        // Hawk protected route:
        // Requests must provide valid hawk signature
        https.route({
            method: 'GET',
            path: '/restricted',
            config: {
                handler: function (request, reply) {
                    console.log('request received');
                    reply('top secret');
                }
            }
        });

        if (!module.parent) {
            server.start(function () {
                console.log('server running at: ' + server.info.uri);
            });
        }
    });

module.exports = server;
