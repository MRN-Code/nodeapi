/*jscs:disable*/
/**
 * Note: in order for the agent to be run, the environment variable NEW_RELIC_ENABLED
 * must be set to true.
 * Additionally, the API key must be assigned to the environment variable
 * NEW_RELIC_LICENSE_KEY
 */
/**
* New Relic agent configuration.
*
* See lib/config.defaults.js in the agent distribution for a more complete
* description of configuration variables and their potential values.
*/
exports.config = {
    /**
    * Array of application names.
    */
    app_name: ['COINS3.0API'],
    logging: {
        /**
        * Level at which to log. 'trace' is most useful to New Relic when diagnosing
        * issues with the agent, 'info' and higher will impose the least overhead on
        * production applications.
        */
        level: 'info',
        filepath: require('path').join(process.cwd(), 'logs', 'newrelic_agent.log')
    },
    agent_enabled: false
}
