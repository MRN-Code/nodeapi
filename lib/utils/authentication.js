'use strict';

const authUtils = { initialized: false };
const config = require('config');
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const boom = require('boom');
const Mcrypt = require('mcrypt').MCrypt;
const cypher = new Mcrypt('rijndael-128', 'ecb');
const Bluebird = require('bluebird');
const bcryptCompare = Bluebird.promisify(bcrypt.compare);
const moment = require('moment');

module.exports = function(server) {
    const redisClient = server.plugins['hapi-redis'].client;

    if (authUtils.initialized) {
        return authUtils;
    }

    if (!redisClient.connected) {
        throw new Error('Redis client not connected: cannot continue');
    }

    cypher.open(server.app.authKey);

    /**
     * get stored hawk credentials from db
     * @param {string} id - the id (public key)
     * @param {function} callback - callback with signature:
     *   `function(error, credentials){ ... }`
     * @return {null}
     */
    authUtils.getHawkCredentials = function(id, callback) {
        redisClient.hgetall(id, function(err, credentials) {
            if (err) {
                callback(err, false);
            } else if (!credentials) {
                callback(null, false);
            } else {
                callback(null, credentials);
            }
        });
    };

    /**
     * Generate a new key pair for a user
     * Even though this is a synchronous function, it returns a promise
     * This will allow for an easy transition to async key generators
     * @param {string} username - unencrypted username
     * @return {Promise} resolves to a credentials object
     *   where credentials is an object with the following properties:
     *   `id, key, algorithm, issueTime, expireTime, studyRoles`
     */
    authUtils.generateHawkCredentials = function(username) {

        return refreshCurrentStudyRoles(credentials.username)
            .then((roleList) => {
                return const credentials = {
                    username: username,
                    id: uuid.v4(),
                    key: uuid.v4(),
                    algorithm: config.algorithm,
                    issueTime: + new Date(),
                    expireTime: + new Date() + config.hawkKeyLifespan,
                    studyRoles: roleList
                };
            });
    };

    /**
     * Retrieves the current roles for a user, revokes old roles, and
     * adds the new roles
     * @param {string} username - the username to retrieve roles
     * @return {object} roles - the current roles
     */
    function refreshCurrentStudyRoles(username) {
        const encryptedUsername = cypher.encrypt(username.trim())
            .toString('base64');

        const UserRole = server.plugins.bookshelf.model('UserStudyRole');
    
        return new UserRole()
            .where({username: encryptedUsername})
            .fetchAll({withRelated: 'role'})
            .then((roleCollection) => {
                return revokeRoles(username)
                .then(() => {return addRolesFromCollection(username, roleCollection);})
                .then(() => {
                    return relations.studyAsync('Describe what %s can do', username)
                        .then((studyRoles) => {
                            return studyRoles;
                        });
                });
            }).catch((err) => {
                server.log(['error', 'refreshRoles'], err);
                throw(err);
            });
    }
    
    /**
     * helper function to revoke all roles from Relations
     * @param {string} username - the username to retrieve roles
     * @return {object} roles - the current roles
     */
    function revokeRoles(username) {
        let revokes = [];
        return relations.studyAsync('Describe what %s can do', username)
            .then((roles) => {
                _.each(roles, (value, key) => {
                    _.each(value, (subValue, subKey) => {
                        revokes.push(relations.studyAsync('%s is not the %s of %s',
                            username, subValue, key));
                    });
                });
    
                return Bluebird.all(revokes);
            }).catch((err) => {
                server.log(['error', 'revokeRoles'], err);
                throw(err);
            });
    
    }
    
    /**
     * helper function to add all roles from a Bookshelf collection
     * of database roles to Relations
     * @param {string} username - the username to retrieve roles
     * @param {collection} roleCollection - the Bookshelf collection of roles
     * @return {object} roles - the current roles
     */
    function addRolesFromCollection(username, roleCollection) {
        let roleAdditions = [];
        roleCollection.each((value, key) => {
            roleAdditions.push(relations.studyAsync('%s is the %s of %s',
                    username, value.related('role')
                    .get('label').toLowerCase(), value.get('study_id')));
        });

        return Bluebird.all(roleAdditions)
        .catch((err) => {
            server.log(['error', 'addRoles'], err);
            throw(err);
        });
    }

    /**
     * Validate user credentials against records in the mock-db
     * @param {string} username - unencrypted username
     * @param {string} password - unencrypted password
     * @return {Bluebird} resolves to credentials if validation successful
                         resolves to false if Unsuccessul
                         rejects with error if an error occurred
     */
    authUtils.validateUser = function(username, password) {
        const User = server.plugins.bookshelf.model('User');
        const encryptedUsername = cypher.encrypt(username.trim())
            .toString('base64');
        let userObj = {};
        if (!username || !password) {
            return Bluebird.reject(
                boom.unauthorized('Missing username or password')
            );
        }

        /**
         * validate that the user's account and pwd have not expired
         * @param  {object} user Bookshelf model for user
         * @return {object}      the user object
         */
        const checkAccountStatus = (user) => {
            if (user === null) {
                throw boom.unauthorized('Unknown username and password');
            }

            if (moment().isAfter(user.get('acct_exp_date'))) {
                throw boom.unauthorized('Account expired');
            }

            if (moment().isAfter(user.get('password_exp_date'))) {
                throw boom.unauthorized('Password expired');
            }

            if (user.get('active_flag') === 'N') {
                throw boom.unauthorized('Account deactivated');
            }

            //set userObj in closure
            userObj = user;

            return user;
        };

        /**
         * compare the password_hash of the user model to `password` in closure
         * @param  {BookshelfModel} user bookshelf Model representing the user
         * @return {Bluebird} a promise that resolves to true or false
         */
        const comparePassword = (user) => {

            // php formats hashes with the $2y$ vs node's $2a$
            // this corrects them: the hashes are the same otherwise
            const rawPass = user.get('password_hash');
            const correctedPass = rawPass.replace(/^\$2y\$/i, '\$2a$');
            return bcryptCompare(password, correctedPass);
        };

        /**
         * handle pwd comparison results
         * @param  {boolean} res the result of a bcrypt.compare operation
         * @return {object}      and object of form { username: username }
         */
        const handleCompare = (res) => {
            if (!res) {
                throw boom.unauthorized('Invalid username and password');
            }

            return {
                username: userObj.get('username'),
                acctExpDate: userObj.get('acct_exp_date'),
                passwordExpDate: userObj.get('password_exp_date'),
                siteId: userObj.get('site_id')
            };
        };

        //TODO: if User is ever protected with the bookshelf shield,
        //we will need to figure out a way to get around that...
        return new User({username: encryptedUsername})
            .fetch()
            .then(checkAccountStatus)
            .then(comparePassword)
            .then(handleCompare)
            .catch(function(err) {
                server.log(['error', 'validate-user'], err);
                throw(err);
            });
    };

    return authUtils;
};
