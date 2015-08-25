'use strict';
const boom = require('boom');
const joi = require('joi');
const _ = require('lodash');
const authUtils = require('./../utils/authentication.js');

const internals = {};

/**
 * Test whether a user with at least one of the properties exists
 * @param  {object} userModel bookshelf model to fetch user data
 * @param  {object} userData  object containing properties to match the user on
 * @return {object}          undefined if no matches found,
 *                                 otherwise a bookshelf object
 */
internals.getUser = (UserModel, userData) => {
    const user = new UserModel();

    //clone to avoid mutation
    let userDataClone = _.clone(userData);
    let username = userData.username;
    let qbObj;
    if (username) {
        userDataClone.username = authUtils.encryptUsername(username);
    }

    // build query object
    qbObj = _.map(userDataClone, (val, key) => {
        const keyVal = {};
        keyVal[key] = val;
        return {orWhere: keyVal};
    });

    return user
        .query(qbObj)
        .fetch();
};

internals.addUser = (UserModel, userData) => {
    const userDataClone = _.clone(userData);
    const username = userDataClone.username;
    const password = userDataClone.password;
    const setHashedPassword = (password) => {
        /* jscs:disable */
        userDataClone.hashed_password = password; //jshint ignore:line
        /* jscs:enable */
        return userDataClone;
    };

    const saveUser = () => {
        return UserModel.forge(userDataClone).save();
    };

    if (username) {
        userDataClone.username = authUtils.encryptUsername(username);
    }

    return authUtils.hashPassword(password)
        .then(setHashedPassword)
        .then(saveUser);
};

module.exports.create = {
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
            name: joi.string().required(),
            institution: joi.string().required(),
            password: joi.string().required().min(8).max(32)
        })
    },
    handler: (request, reply) => {
        const User = request.plugins.bookshelf.models('User');
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

            const existingProperties = _.filter(userData, (val, key) => {
                return existingUser.get(key) === val;
            });

            throw boom.badData('User data already exists', existingProperties);
        };

        //Check whether username or email already exist
        internals.getUser(User, userData)
            .then(compareExistingUser)
            .then(internals.addUser)
            .then(reply)
            .catch((err) => {
                request.log(['error', 'users'], err.message);
                reply(boom.wrap(err));
            });
    }
};
