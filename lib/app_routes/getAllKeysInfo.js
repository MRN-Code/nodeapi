'use strict';

exports.register = function (server, options, next) {
    var client = options.redisClient;
    server.route({
        method: 'GET',
        path: '/profile/keys',
        config: {
            //auth: false,
            handler: function (request, reply) {
                var username = 'john';
                var keys = [];
                client.smembers(username, function (err, members) {
                    var count = 0;
                    members.forEach(function(id) {
                        client.hget(id, 'key', function (err, key) {
                            keys.push(key);
                            count++;
                            if (count === members.length) {
                                reply(keys);
                            }
                        });
                    });
                });
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'getAllKeysInfo'
};
