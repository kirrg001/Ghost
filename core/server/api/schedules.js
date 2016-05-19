var _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment'),
    config = require('../config'),
    pipeline = require(config.paths.corePath + '/server/utils/pipeline'),
    dataProvider = require(config.paths.corePath + '/server/models'),
    i18n = require(config.paths.corePath + '/server/i18n'),
    errors = require(config.paths.corePath + '/server/errors'),
    utils = require('./utils');

/**
 * publish a scheduled post
 */
exports.publishPost = function publishPost(options) {
    options = options || {};

    // CASE: only the scheduler client is allowed to publish (hardcoded because of missing client permission system)
    if (!options.context || !options.context.client || options.context.client !== 'ghost-scheduler') {
        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.permissions.noPermissionToAction')));
    }

    return pipeline([
        utils.validate('posts', {opts: utils.idDefaultOptions}),
        function (cleanOptions) {
            return dataProvider.Post.edit({status: 'published'}, _.omit(cleanOptions, 'data'))
                .then(function (result) {
                    return Promise.resolve({post: result.toJSON(cleanOptions)});
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
