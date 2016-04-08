'use strict';

var config = require('config');

var redisConfig = {
  port: config.get('redis').port,
  host: config.get('redis').host
};

function getRedisConfig() {
  return redisConfig;
}

module.exports = getRedisConfig;
