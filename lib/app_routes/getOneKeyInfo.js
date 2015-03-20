'use strict';

exports.register = function (server, options, next) {
    var client = options.redisClient;
    server.route({
        method: 'GET',
        path: '/profile/key/{id}',
        config: {
            //auth: false,
            handler: function (request, reply) {
                var username = 'john';
                var id = request.params.id;
                client.sismember(username, id, function (err, valid) {
                    if (valid) {
                        client.hget(id, 'key', function (err, key) {
                            reply(key);
                        });
                    } else {
                        reply('Invalid id provided');
                    }
                });
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'getOneKeyInfo'
};
