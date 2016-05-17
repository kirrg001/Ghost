var config = require('../../../../config'),
    models = require(config.paths.corePath + '/server/models'),
    sequence = require(config.paths.corePath + '/server/utils/sequence'),
    moment = require('moment'),
    Promise = require('bluebird'),
    messagePrefix = 'Transform into UTC Dates: ',
    settingsKey = '006/01';

/**
 * there is no chance to calculate UTC dates 100% accurate from DB values because of DST
 * we ignore DST, we loose one hour in worst case
 */
module.exports = function transformDatesIntoUTC(options, logger) {
    var ServerTimezoneOffset = new Date().getTimezoneOffset(),
        settingsMigrations = null;

    return sequence([
        function () {
            if (ServerTimezoneOffset === 0) {
                return Promise.reject(new Error('skip'));
            }

            return Promise.resolve();
        },
        function () {
            return models.Settings.findOne({context: {internal: true}, key: 'migrations'})
                .then(function (result) {
                    try {
                        settingsMigrations = JSON.parse(result.attributes.value) || {};
                    } catch (err) {
                        return Promise.reject(err);
                    }

                    // CASE: migration ran already
                    if (settingsMigrations.hasOwnProperty(settingsKey)) {
                        return Promise.reject(new Error('skip'));
                    }

                    return Promise.resolve();
                });
        },
        function () {
            return models.Posts.forge().fetch().then(function (result) {
                if (result.models.length === 0) {
                    logger.warn(messagePrefix + 'No Posts found');
                    return;
                }

                return Promise.map(result.models, function mapper(post) {
                    if (post.get('published_at')) {
                        post.set('published_at', moment(post.get('published_at')).add(ServerTimezoneOffset, 'minutes').toDate());
                    }

                    post.set('created_at', moment(post.get('created_at')).add(ServerTimezoneOffset, 'minutes').toDate());
                    post.set('updated_at', moment(post.get('updated_at')).add(ServerTimezoneOffset, 'minutes').toDate());

                    options.id = post.get('id');
                    return models.Post.edit(post.toJSON(), options);
                }).then(function () {
                    logger.info(messagePrefix + 'Updated datetime fields for Posts!');
                });
            });
        },
        function () {
            return models.Users.forge().fetch().then(function (result) {
                if (result.models.length === 0) {
                    logger.warn(messagePrefix + 'No Users found');
                    return;
                }

                return Promise.map(result.models, function mapper(user) {
                    if (user.get('last_login')) {
                        user.set('last_login', moment(user.get('last_login')).add(ServerTimezoneOffset, 'minutes').toDate());
                    }

                    if (user.get('updated_at')) {
                        user.set('updated_at', moment(user.get('updated_at')).add(ServerTimezoneOffset, 'minutes').toDate());
                    }

                    user.set('created_at', moment(user.get('created_at')).add(ServerTimezoneOffset, 'minutes').toDate());

                    options.id = user.get('id');
                    return models.User.edit(user.toJSON(), options);
                }).then(function () {
                    logger.info(messagePrefix + 'Updated datetime fields for Users!');
                });
            });
        },
        function () {
            return models.Subscribers.forge().fetch().then(function (result) {
                if (result.models.length === 0) {
                    logger.warn(messagePrefix + 'No Subscribers found');
                    return;
                }

                return Promise.map(result.models, function mapper(subscriber) {
                    if (subscriber.get('unsubscribed_at')) {
                        subscriber.set('unsubscribed_at', moment(subscriber.get('unsubscribed_at')).add(ServerTimezoneOffset, 'minutes').toDate());
                    }

                    if (subscriber.get('updated_at')) {
                        subscriber.set('updated_at', moment(subscriber.get('updated_at')).add(ServerTimezoneOffset, 'minutes').toDate());
                    }

                    subscriber.set('created_at', moment(subscriber.get('created_at')).add(ServerTimezoneOffset, 'minutes').toDate());

                    options.id = subscriber.get('id');
                    return models.Subscriber.edit(subscriber.toJSON(), options);
                }).then(function () {
                    logger.info(messagePrefix + 'Updated datetime fields for Subscribers!');
                });
            });
        },
        function () {
            return models.Settings.forge().fetchAll().then(function (result) {
                if (result.models.length === 0) {
                    logger.warn(messagePrefix + 'No Settings found');
                    return;
                }

                return Promise.map(result.models, function mapper(settings) {
                    if (settings.get('updated_at')) {
                        settings.set('updated_at', moment(settings.get('updated_at')).add(ServerTimezoneOffset, 'minutes').toDate());
                    }

                    settings.set('created_at', moment(settings.get('created_at')).add(ServerTimezoneOffset, 'minutes').toDate());

                    options.id = settings.get('id');
                    return models.Settings.edit(settings.toJSON(), options);
                }).then(function () {
                    logger.info(messagePrefix + 'Updated datetime fields for Settings!');
                });
            });
        },
        function () {
            return Promise.all(['Roles', 'Permissions', 'Tags', 'Apps', 'AppSettings', 'AppFields', 'Clients'].map(function (model) {
                return models[model].forge().fetch().then(function (result) {
                    if (result.models.length === 0) {
                        logger.warn(messagePrefix + 'No {model} found'.replace('{model}', model));
                        return;
                    }

                    return Promise.map(result.models, function mapper(object) {
                        object.set('created_at', moment(object.get('created_at')).add(ServerTimezoneOffset, 'minutes').toDate());

                        if (object.get('updated_at')) {
                            object.set('updated_at', moment(object.get('updated_at')).add(ServerTimezoneOffset, 'minutes').toDate());
                        }

                        options.id = object.get('id');
                        return models[model.slice(0, -1)].edit(object.toJSON(), options);
                    }).then(function () {
                        logger.info(messagePrefix + 'Updated datetime fields for {model}!'.replace('{model}', model));
                    });
                });
            }));
        },
        function () {
            settingsMigrations[settingsKey] = moment().format();
            return models.Settings.edit({
                key: 'migrations',
                value: JSON.stringify(settingsMigrations)
            }, {context: {internal: true}});
        }]
    ).catch(function (err) {
        if (err.message === 'skip') {
            logger.info(messagePrefix + 'Your Application uses UTC, skip!');
            return Promise.resolve();
        }

        return Promise.reject(err);
    });
};
