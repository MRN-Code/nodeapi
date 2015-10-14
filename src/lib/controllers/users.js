'use strict';
const boom = require('boom');
const joi = require('joi');
const _ = require('lodash');
const moment = require('moment');

const internals = {};

/**
 * Test whether a user with at least one of the properties exists
 * @param  {object} authUtils an instance of the authentication utilities
 * @param  {object} userModel bookshelf model to fetch user data
 * @param  {object} userData  object containing properties to match the user on
 * @return {object}          undefined if no matches found,
 *                                 otherwise a bookshelf object
 */
internals.getUser = (authUtils, UserModel, userData) => {
    const user = new UserModel();
    const formatQuery = user._utils.formatQuery;

    //clone to avoid mutation
    let username = userData.username;
    let qbObj = {orWhere: formatQuery(userData)};
    if (username) {
        qbObj.orWhere.username = authUtils.encryptUsername(username);
    }

    return user
        .query(qbObj)
        .fetch();
};

internals.defaultValues = {
    siteId: '-1',
    activeFlag: 'Y',
    passwordExpDate: moment().add(1, 'years').format('MM/DD/YYYY'),
    acctExpDate: moment().add(1, 'years').format('MM/DD/YYYY')
};

/**
 * Call the toJSON method on the object
 * @param  {Object} obj object to call the toJSON method on (bookshelf)
 * @return {string}     JSON
 */
internals.callToJson = (obj) => {
    return obj.toJSON();
};

/**
 * Call the fetch method on the object
 * @param  {Object} obj object to call the fetch method on (bookshelf)
 * @return {Promise}
 */
internals.callFetch = (obj) => {
    //remove all attributes but username
    obj.attributes = { username: obj.get('username') };
    return obj.fetch();
};

/**
 * hide protected fields so that they are no returned
 * @param  {object} obj bookshelf object of user
 * @return {object}     sanitized model
 */
internals.sanitize = (obj) => {
    delete obj.attributes.passwordHash;
    delete obj.attributes.passwordResetKey;
    return obj;
};

/**
 * Add new user to database
 * @param  {object} userModel bookshelf model to fetch user data
 * @param  {object} userData  object containing properties to match the user on
 * @return {[type]}           [description]
 */
internals.addUser = (authUtils, UserModel, userData) => {
    const userDataClone = _.clone(userData);
    const username = userDataClone.username;
    const password = userDataClone.password;
    const setHashedPassword = (password) => {
        userDataClone.passwordHash = password;
        userDataClone.password = null;
        return userDataClone;
    };

    const saveUser = (userData) => {
        return UserModel.forge(userData).save(null, {method: 'insert'});
    };

    if (username) {
        userDataClone.username = authUtils.encryptUsername(username);
    }

    return authUtils.hashPassword(password)
        .then(setHashedPassword)
        .then(_.partialRight(_.defaults, internals.defaultValues))
        .then(saveUser);
};

module.exports.post = {
    tags: ['api', 'users'],
    notes: [
        'Creates a new user with the properties in the payload.'
    ].join('<br>'),
    description: 'Creates a new user with the properties in the payload.',
    auth: false,
    validate: {
        payload: joi.object().keys({
            username: joi.string().min(3).max(20).required(),
            email: joi.string().email().required(),
            label: joi.string().required(),
            password: joi.string().required().min(8).max(71)
        })
    },
    response: {
        schema: joi.object().keys({
            username: joi.string().min(3).max(20).required(),
            email: joi.string().email().required(),
            label: joi.string().required(),
            siteId: joi.string().required(),
            activeFlag: joi.string().required(),
            passwordExpDate: joi.date().required(),
            acctExpDate: joi.date().required(),
            isSiteAdmin: joi.string().required(),
            emailUnsubscribed: joi.boolean().required()
        })
    },
    handler: (request, reply) => {
        const authUtils = request.server.plugins.utilities.auth;
        const User = request.server.plugins.bookshelf.model('User');
        const userData = {
            username: request.payload.username,
            email: request.payload.email
        };

        /**
         * compare a user model retrieved from DB against the supplied input
         * @param  {object} existingUser bookshelf model of existing user
         * @return {boolean}              true if existingUser DNE.
         *                                Throws exception otherwise
         */
        const compareExistingUser = (existingUser) => {
            if (!existingUser) {

                // no matching user found
                return true;
            }

            const existingProperties = _.reduce(userData, (res, val, key) => {
                if (existingUser.get(key) === val) {
                    res[key] = val;
                }

                return res;
            }, {});

            throw boom.badData('User data already exists', existingProperties);
        };

        //Check whether username or email already exist
        internals.getUser(authUtils, User, userData)
            .then(compareExistingUser)
            .then(_.partial(
                internals.addUser,
                authUtils,
                User,
                request.payload
            ))
            .then(internals.callFetch)
            .then(internals.sanitize)
            .then(internals.callToJson)
            .then(reply)
            .catch((err) => {
                request.log(['error', 'users'], err.message);
                reply(boom.wrap(err));
            });
    }
};

module.exports.sanitize = internals.sanitize;
