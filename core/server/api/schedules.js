var _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment'),
    config = require('../config'),
    pipeline = require(config.paths.corePath + '/server/utils/pipeline'),
    dataProvider = require(config.paths.corePath + '/server/models'),
    i18n = require(config.paths.corePath + '/server/i18n'),
    errors = require(config.paths.corePath + '/server/errors'),
    apiPosts = require(config.paths.corePath + '/server/api/posts'),
    mail = require(config.paths.corePath + '/server/mail'),
    apiSettings = require(config.paths.corePath + '/server/api/settings'),
    utils = require('./utils');

/**
 * publish a scheduled post
 *
 * object.force: you can force publishing a post in the past (for example if your service was down)
 */
exports.publishPost = function publishPost(object, options) {
    if (_.isEmpty(options)) {
        options = object || {};
        object = {};
    }

    var post, publishedAtMoment,
        publishAPostBySchedulerToleranceInMinutes = config.times.publishAPostBySchedulerToleranceInMinutes;

    // CASE: only the scheduler client is allowed to publish (hardcoded because of missing client permission system)
    if (!options.context || !options.context.client || options.context.client !== 'ghost-scheduler') {
        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.permissions.noPermissionToAction')));
    }

    options.context = {internal: true};

    return pipeline([
        utils.validate('posts', {opts: utils.idDefaultOptions}),
        function (cleanOptions) {
            cleanOptions.status = 'scheduled';

            return apiPosts.read(cleanOptions)
                .then(function (result) {
                    post = result.posts[0];
                    publishedAtMoment = moment(post.published_at);

                    if (publishedAtMoment.diff(moment(), 'minutes') > publishAPostBySchedulerToleranceInMinutes) {
                        return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.job.notFound')));
                    }

                    if (publishedAtMoment.diff(moment(), 'minutes') < publishAPostBySchedulerToleranceInMinutes * -1 && object.force !== true) {
                        return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.job.publishInThePast')));
                    }

                    return apiPosts.edit({posts: [{status: 'published'}]}, _.pick(cleanOptions, ['context', 'id']));
                });
        }
    ], options);
};

/**
 * get all scheduled posts/pages
 * permission check not needed, because route is not exposed
 */
exports.getScheduledPosts = function readPosts(options) {
    options = options || {};
    options.context = {internal: true};

    return pipeline([
        utils.validate('posts', {opts: ['from', 'to']}),
        function (cleanOptions) {
            cleanOptions.filter = 'status:scheduled';
            cleanOptions.columns = ['id', 'published_at', 'created_at'];

            if (cleanOptions.from) {
                cleanOptions.filter += '+created_at:>=\'' + moment(cleanOptions.from).format('YYYY-MM-DD HH:mm:ss') + '\'';
            }

            if (cleanOptions.to) {
                cleanOptions.filter += '+created_at:<=\'' + moment(cleanOptions.to).format('YYYY-MM-DD HH:mm:ss') + '\'';
            }

            return dataProvider.Post.findAll(cleanOptions)
                .then(function (result) {
                    return Promise.resolve({posts: result.models});
                });
        }
    ], options);
};

/**
 * @TODO:
 * - mail config!mailgun config!
 */
exports.sendNewsletter = function sendNewsletter(options) {
    var fromMoment = config.newsletter.lastExecutedAt ? moment(config.newsletter.lastExecutedAt) : moment().subtract(30, 'days'),
        toMoment = moment(),
        mailgun = new mail.GhostMailgun({
            apiKey: config.mail.options.auth.apiKey,
            domain: config.mail.options.auth.domain
        }), posts, subscribers;

    // CASE: only the scheduler client is allowed to publish (hardcoded because of missing client permission system)
    if (!options.context || !options.context.client || options.context.client !== 'ghost-scheduler') {
        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.permissions.noPermissionToAction')));
    }

    // CASE: newsletter was disabled, but job was even though triggered
    if (config.newsletter.status === 'disabled') {
        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.permissions.noPermissionToAction')));
    }

    // @TODO: ensure newsletter should really get executed NOW
    // this can be done by checking NOW with getting the next execution date by rrule

    options.context = {internal: true};

    // @TODO: yes/no?
    options.limit = 5;
    options.filter = 'status:published';
    options.filter = 'created_at:>=\'' + fromMoment.format('YYYY-MM-DD HH:mm:ss') + '\'';
    options.filter += '+created_at:<=\'' + toMoment.format('YYYY-MM-DD HH:mm:ss') + '\'';

    return dataProvider.Post.findAll(options)
        .then(function (result) {
            if (!result || !result.length) {
                return Promise.resolve();
            }

            posts = result.models;
            return dataProvider.Subscriber.findAll({filter: 'status:subscribed'});
        }).then(function (result) {
            if (!result || !result.length) {
                return Promise.resolve();
            }

            subscribers = result.models;

            return Promise.all(_.map(posts, function (post) {
                return mail.utils.generateContent({
                    template: 'newsletter/post',
                    data: post.toJSON()
                });
            })).then(function (posts) {
                return _.reduce(posts, function (first, second) {
                    return first.html + second.html;
                });
            });
        })
        .then(function (html) {
            if (!html) {
                return Promise.resolve();
            }

            return mail.utils.generateContent({
                template: 'newsletter/index',
                data: {
                    posts: html
                }
            });
        })
        .then(function (result) {
            if (!result) {
                return Promise.resolve();
            }

            subscribers = subscribers.map(function (subscriber) {
                return subscriber.toJSON();
            });

            return new Promise(function (resolve, reject) {
                mailgun.send({
                    title: 'Newsletter',
                    from: config.newsletterFromAddress || config.mail.from,
                    tag: (config.userId || config.getBaseUrl()) + '_' + moment().valueOf(),
                    to: subscribers,
                    text: result.text,
                    html: result.html
                }, function (err) {
                    if (err) {
                        return reject(err);
                    }

                    resolve();
                });
            });
        })
        // @TODO: error handling?
        .finally(function () {
            // we always update the settings entry, even if it was not successful, to ensure newsletter gets rescheduled
            config.newsletter.lastExecutedAt = toMoment.valueOf();
            return dataProvider.Settings.edit({
                key: 'newsletter',
                value: JSON.stringify(config.newsletter)
            }, options);
        })
};
