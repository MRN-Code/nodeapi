'use strict';

const authUtils = { initialized: false };
const config = require('config');
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const boom = require('boom');
const cypher = require('./get-mcrypt-cypher.js')();
const Bluebird = require('bluebird');
const bcryptCompare = Bluebird.promisify(bcrypt.compare);
const bcryptGenSalt = Bluebird.promisify(bcrypt.genSalt);
const bcryptHash = Bluebird.promisify(bcrypt.hash);
const moment = require('moment');
const _ = require('lodash');
const userController = require('../controllers/users.js');

module.exports.register = function(server, options, next) {
    const redisClient = server.plugins['hapi-redis'].client;
    const relations = server.plugins.relations;

    if (!redisClient.connected) {
        throw new Error('Redis client not connected: cannot continue');
    }

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
     * @param {Bookshelf} user - user model (pre-sanitized)
     * @return {Bluebird} resolves to a credentials object
     *   where credentials is an object with the following properties:
     *   `id, key, algorithm, issueTime, expireTime, studyRoles`
     */
    authUtils.generateHawkCredentials = function(user) {
        const username = user.get('username');

        return refreshCurrentStudyRoles(username)
            .then((roleList) => {
                const epoch = (new Date()).getTime();
                const credentials = {
                    username: username,
                    user: userController.sanitize(user).toJSON(),
                    id: uuid.v4(),
                    key: uuid.v4(),
                    algorithm: config.algorithm,
                    issueTime: epoch,
                    expireTime: epoch + config.hawkKeyLifespan,
                    studyRoles: roleList
                };

                return credentials;
            });
    };

    /**
     * Retrieves the current roles for a user, revokes old roles, and
     * adds the new roles
     * @param {string} username - the username to retrieve roles
     * @return {object} roles - the current roles
     */
    function refreshCurrentStudyRoles(username) {
        const encryptedUsername = authUtils.encryptUsername(username);

        const UserRole = server.plugins.bookshelf.model('UserStudyRole');
        /**
         * helper function to revoke old and then add current roles
         * @param {object} roleCollection - the Bookshelf collection
         * @return {object} Promise - addRoles promise
         */
        const resetStudyRoles = (roleCollection) => {
            return revokeRoles(username)
                .then(_.partial(
                            addRolesFromCollection,
                            username,
                            roleCollection
                ));
        };

        /**
         * helper function to retrieve all of a users current roles
         * @return {object} roles - the current roles
         */
        const getStudyRoles = () => {
            return relations.studyAsync('Describe what %s can do', username);
        };

        return new UserRole()
            .where({username: encryptedUsername})
            .fetchAll({withRelated: 'role'})
            .then(resetStudyRoles)
            .then(getStudyRoles)
            .catch((err) => {
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
                _.each(roles, (roleNames, studyId) => {
                    _.each(roleNames, (roleName) => {
                        revokes.push(
                            relations.studyAsync(
                                '%s is not the %s of %s',
                                 username,
                                 roleName,
                                 studyId
                        ));
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
        const rolePromises = roleCollection.map((role) => {
            return relations.studyAsync(
                '%s is the %s of %s',
                username,
                role.related('role').get('label').toLowerCase(),
                role.get('studyId'));

        });

        return Bluebird.all(rolePromises)
            .catch((err) => {
                server.log(['error', 'addRoles'], err);
                throw(err);
            });
    }

    /**
     * encrypt a username
     * @param  {string} username
     * @return {string} the encrypted username
     */
    authUtils.encryptUsername = (username) => {
        const encrypted = cypher.encrypt(username.trim())
            .toString('base64');
        return encrypted;
    };

    /**
     * hash a plain text password
     * @param  {string} password the plain text password
     * @return {string}          the hashed string
     */
    authUtils.hashPassword = (password) => {
        return bcryptGenSalt(12)
            .then(_.partial(bcryptHash, password));
    };

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
        let userObj = {};
        const encryptedUsername = authUtils.encryptUsername(username);
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

            if (moment().isAfter(user.get('acctExpDate'))) {
                throw boom.unauthorized('Account expired');
            }

            if (moment().isAfter(user.get('passwordExpDate'))) {
                throw boom.unauthorized('Password expired');
            }

            if (user.get('activeFlag') === 'N') {
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

            const rawPass = user.get('passwordHash');
            let msg;

            // validate that rawPass is not falsy
            if (!rawPass) {
                msg = 'Empty pwd hash for ' + user.get('username');
                server.log(['info', 'validate-user'], msg);
                return Bluebird.resolve(false);
            }

            // php formats hashes with the $2y$ vs node's $2a$
            // this corrects them: the hashes are the same otherwise
            const correctedPass = rawPass.replace(/^\$2y\$/i, '\$2a$');
            return bcryptCompare(password, correctedPass);
        };

        /**
         * handle pwd comparison results
         * @param  {boolean} res the result of a bcrypt.compare operation
         * @return {object}      user model
         * */
        const handleCompare = (res) => {
            if (!res) {
                throw boom.unauthorized('Invalid username and password');
            }

            return userObj;
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

    server.expose('auth', authUtils);
    next();
};

module.exports.register.attributes = {
    name: 'utilities'
};
