'use strict';
const path = require('path');

// export plugin registration function
exports.register = (server, options, next) => {
  const clientDistPath = path.join(__dirname, '../../../dist/client/dist');
  server.route({
    path: '/client/{param*}',
    method: 'GET',
    config: {
      auth: false,
      cors: true,
      description: 'Returns client source code',
      notes: 'Add filename (e.g. client.js)',
      handler: {
        directory: {
          path: clientDistPath,
          listing: true
        }
      },
      plugins: { 'hapi-swagger': { nickname: 'get' } },
      tags: ['client'],
    }
  });
  next();
};

exports.register.attributes = {
  name: 'client-source'
};
