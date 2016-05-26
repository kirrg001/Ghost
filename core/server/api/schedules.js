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
 * - add mailgun settings
 *
 * @TODO: wait that GQL supports dates for all databases
 * @TODO: database date query will not work when we merge UTC force, because we normalize the datetime values in the DB
 */
exports.sendNewsletter = function sendNewsletter(object, options) {
    var from = config.newsletter.lastExecutedAt || moment().subtract(30, 'days'),
        to = new Date(),
        mailgun = new mail.Mailgun({
            apiKey: config.mail.options.auth.apiKey,
            domain: config.mail.options.auth.domain,
            tag: config.mail.options.auth.tag
        });

    // CASE: only the scheduler client is allowed to publish (hardcoded because of missing client permission system)
    if (!options.context || !options.context.client || options.context.client !== 'ghost-scheduler') {
        return Promise.reject(new errors.NoPermissionError());
    }

    options.context = {internal: true};
    options.limit = 5;

    if (['mysql', 'pg'].indexOf(config.database.client) !== -1) {
        options.filter = '+created_at:>=\'' + moment(from).format('YYYY-MM-DD HH:mm:ss') + '\'';
    } else {
        options.filter += '+created_at:>=' + moment(from).valueOf();
    }

    if (['mysql', 'pg'].indexOf(config.database.client) !== -1) {
        options.filter += '+created_at:<=\'' + moment(to).format('YYYY-MM-DD HH:mm:ss') + '\'';
    } else {
        options.filter += '+created_at:<=' + moment(to).valueOf();
    }

    return dataProvider.Posts.findAll(options)
        .then(function (result) {
            if (!result.length) {
                return Promise.resolve();
            }

            return Promise.all(lodash.map(result, function (model) {
                return mail.utils.generateContent({
                    template: 'newsletter/post',
                    data: model.toJSON()
                });
            })).then(function (posts) {
                return lodash.reduce(posts, function (first, second) {
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
            return dataProvider.Subscribers.findAll({filter: 'status:subscribed'})
                .then(function (subscribers) {
                    return mailgun.send({
                        title: 'Newsletter',
                        from: config.account.mail.from || config.mail.from,
                        to: subscribers.toJSON(),
                        text: result.text,
                        html: result.html
                    });
                });
        })
        .then(function () {
            // @TODO: does this work?
            // if we update lastExecutedAt, event is triggered and the newsletter is scheduled again for the next upcomming date
            return api.Settings.edit({settings: [{newsletter: {lastExecutedAt: to}}]}, options);
        })
};
