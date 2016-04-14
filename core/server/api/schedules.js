var _ = require('lodash'),
    Promise = require('bluebird'),
    pipeline = require('../utils/pipeline'),
    dataProvider = require('../models'),
    utils = require('./utils');

/**
 * publish a scheduled post
 */
exports.publishPost = function publishPost(object, options) {
    options = options || {};

    return pipeline([
        utils.validate('posts', {opts: utils.idDefaultOptions}),
        utils.handlePermissions('schedules', 'edit'),
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
    options.context = {internal:true};

    return pipeline([
        utils.validate('posts', {opts: ['from', 'to']}),
        function (cleanOptions) {
            cleanOptions.filter = 'status:scheduled';

            if (cleanOptions.from) {
                cleanOptions.filter += '+published_at:>=\'' + cleanOptions.from + '\'';
            }

            if (cleanOptions.to) {
                cleanOptions.filter += '+published_at:<=\'' + cleanOptions.to + '\'';
            }

            return dataProvider.Post.findAll(cleanOptions)
                .then(function (result) {
                    return Promise.resolve({posts: result.toJSON(cleanOptions)});
                });
        }
    ], options);
};
