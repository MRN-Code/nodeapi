module.exports = (server) => {
  const getCredentialsFunc = server.plugins.utilities.auth.getHawkCredentials;
  const httpConnection = server.connections[0];
  httpConnection.auth.strategy(
        'default',
        'hawk',
    {
      getCredentialsFunc: getCredentialsFunc,
      hawk: {
        hostHeaderName: 'x-forwarded-host'
      }
    }
    );
  httpConnection.auth.default('default');
};
