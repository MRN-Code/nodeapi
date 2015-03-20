'use strict';

exports.register = function (server, options, next) {
    var client = options.redisClient;
    server.route({
        method: 'GET',
        path: '/logout',
        config: {
            handler: function (request, reply) {
                var username = 'john';
                var id = '7c1ef832-e872-4607-b682-18262d30961f';//request.auth.credentials.id;
                //remove id-key upon logging out
                client.exists(id, function(err, exist) {
                    if (exist) {
                        client.del(id, function(err, success) {
                            client.srem(username, id);
                        });
                    }
                });
                reply('You are logged out.').code(200);
            }
        }
    });
    next();
};

exports.register.attributes = {
    name: 'logout'
};
